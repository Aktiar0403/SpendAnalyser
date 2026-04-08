import { google } from 'googleapis';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (!req.headers.tokens) return res.status(401).json({ error: "No tokens provided" });

  try {
    const tokens = JSON.parse(req.headers.tokens);
    const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    let allMessages = [];
    let nextPageToken = null;
    const MAX_EMAILS_TO_FETCH = 400; // Safety limit to prevent Vercel timeout

    // --- PAGINATION LOOP ---
    // This keeps asking Google for the "next page" until we have enough history
    do {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'from:(googleplay-noreply@google.com OR payments-noreply@google.com) "Google Play"',
        maxResults: 100,
        pageToken: nextPageToken
      });

      if (response.data.messages) {
        allMessages = allMessages.concat(response.data.messages);
      }
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken && allMessages.length < MAX_EMAILS_TO_FETCH);

    const transactions = [];

    const getBody = (payload) => {
      if (payload.body?.data) return payload.body.data;
      if (payload.parts) {
        for (const part of payload.parts) {
          const result = getBody(part);
          if (result) return result;
        }
      }
      return null;
    };

    // 2. Parse the emails we found
    for (const msg of allMessages) {
      try {
        const details = await gmail.users.messages.get({ userId: 'me', id: msg.id });
        const rawData = getBody(details.data.payload);
        if (!rawData) continue;

        const body = Buffer.from(rawData, 'base64').toString('utf-8');
        const $ = cheerio.load(body);

        // --- THE "SILVER BULLET" APP NAME SCRAPER ---
        let appName = "";
        
        // Strategy A: Play Store link (Works for most apps)
        const playStoreLink = $("a[href*='details?id=']").first();
        if (playStoreLink.length) {
          appName = playStoreLink.text().trim();
        }

        // Strategy B: Subject Line Fallback (Works for Subscriptions/YouTube)
        if (!appName || appName.length < 2 || appName.includes("Order")) {
          const subject = details.data.payload.headers.find(h => h.name === 'Subject')?.value || "";
          appName = subject.replace(/Your Google Play Order Receipt from/i, "")
                           .replace(/Google Play Receipt/i, "")
                           .replace(/₹.*/, "")
                           .trim();
        }

        const amountMatch = body.match(/₹\s?([0-9,]+\.?\d*)/);
        
        if (amountMatch) {
          const cleanAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
          if (!isNaN(cleanAmount) && cleanAmount > 0) {
            transactions.push({
              id: msg.id,
              date: new Date(parseInt(details.data.internalDate)).toLocaleDateString(),
              rawDate: parseInt(details.data.internalDate),
              amount: cleanAmount,
              app: appName || "Google Play Purchase"
            });
          }
        }
      } catch (err) {
        continue;
      }
    }

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
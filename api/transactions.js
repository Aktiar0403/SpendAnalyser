import { google } from 'googleapis';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const tokens = JSON.parse(req.headers.tokens);
  const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:payments-noreply@google.com "Google Play"',
      maxResults: 50
    });

    const messages = response.data.messages || [];
    const transactions = [];

    for (const msg of messages) {
      const details = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const encodedBody = details.data.payload.parts?.[0]?.body?.data || details.data.payload.body?.data;
      if (!encodedBody) continue;

      const body = Buffer.from(encodedBody, 'base64').toString();
      const $ = cheerio.load(body);

      // Parsing Logic
      const amountRaw = body.match(/₹\s?(\d+\.?\d*)/);
      const appName = $("td").find('span').first().text().trim() || "Google Play Purchase";
      
      if (amountRaw) {
        transactions.push({
          id: msg.id,
          date: new Date(parseInt(details.data.internalDate)).toLocaleDateString(),
          amount: parseFloat(amountRaw[1]),
          app: appName
        });
      }
    }

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
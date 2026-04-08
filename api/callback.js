import { google } from 'googleapis';

export default async function handler(req, res) {
  const { code } = req.query;
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    // In a production app, you'd store tokens in Firestore linked to the user
    // For this flow, we send them back to the frontend to store in localStorage (simpler for web-only setup)
    const tokenString = encodeURIComponent(JSON.stringify(tokens));
    res.redirect(`/?tokens=${tokenString}`);
  } catch (error) {
    res.status(500).send("Authentication failed");
  }
}
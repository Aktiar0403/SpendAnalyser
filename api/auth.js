import { google } from 'googleapis';

export default async function handler(req, res) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Critical for refresh tokens
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly', 'openid', 'email']
  });

  res.redirect(url);
}

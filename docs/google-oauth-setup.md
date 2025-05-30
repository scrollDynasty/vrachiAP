# Google OAuth Integration Setup Guide

This guide explains how to set up Google OAuth for the MedCare project.

## Prerequisites

1. Google account with access to [Google Cloud Console](https://console.cloud.google.com/)
2. Your application running in development mode on http://localhost:5173

## Steps to Set Up Google OAuth

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown menu at the top of the page.
3. Click on "New Project".
4. Enter a name for your project (e.g., "MedCare").
5. Click "Create".

### 2. Enable the Google OAuth API

1. In your new project, go to "APIs & Services" > "Library" from the left navigation menu.
2. Search for "Google OAuth API" or "Google Identity".
3. Click on "OAuth consent screen" from the left navigation menu.
4. Select "External" for User Type and click "Create".
5. Fill out the required information:
   - App name: MedCare
   - User support email: Your email
   - Developer contact information: Your email
6. Click "Save and Continue".
7. In the scopes section, click "Add or Remove Scopes" and add:
   - `./auth/userinfo.email`
   - `./auth/userinfo.profile`
8. Click "Save and Continue".
9. Add test users if you're in testing mode, then click "Save and Continue".
10. Review your settings and click "Back to Dashboard".

### 3. Create OAuth Client ID Credentials

1. Go to "Credentials" in the left navigation menu.
2. Click "Create Credentials" and select "OAuth client ID".
3. Select "Web application" as the Application type.
4. Give your OAuth client a name (e.g., "MedCare Web Client").
5. **IMPORTANT**: Under "Authorized JavaScript origins", add:
   ```
   http://localhost:5173
   ```
6. **IMPORTANT**: Under "Authorized redirect URIs", add:
   ```
   http://localhost:5173/auth/google/callback
   ```
7. Click "Create".
8. A popup will display your Client ID and Client Secret. **Save these values securely**.

### 4. Configure Your Application

1. Locate the `frontend/src/config.js` file in your project.
2. Replace the placeholder value for `GOOGLE_CLIENT_ID` with your actual Client ID:
   ```javascript
   export const GOOGLE_CLIENT_ID = "your-client-id-here"; // Replace with the Client ID from Google
   ```

### 5. Test the Integration

1. Start your frontend application.
2. Navigate to the login page.
3. Click the "Sign in with Google" button.
4. You should be redirected to the Google authentication page.
5. After authentication, you should be redirected back to your application at the callback URL.

## Troubleshooting

### Error: "Error 400: redirect_uri_mismatch"

This error occurs when the redirect URI in your request doesn't match any of the authorized redirect URIs in your Google Cloud Console. Make sure:

1. The redirect URI in your application exactly matches what you've entered in the Google Cloud Console.
2. You've properly encoded the redirect URI in your request.
3. Check for trailing slashes and protocol (http vs https).

### Error: "Unauthorized Client"

This error occurs when your Client ID is incorrect or the application is not properly configured:

1. Check if you've properly copied the Client ID into your application's configuration.
2. Verify that you're using the correct Client ID for the environment (development vs production).

### Browser Console Errors

If you see errors in the browser console related to Google OAuth:

1. Check that CORS is properly configured.
2. Verify that all Google OAuth parameters in your request are correctly formatted.
3. Ensure the scopes requested are properly configured in your Google Cloud Console project.

## Production Deployment

When deploying to production:

1. Add your production domain to both Authorized JavaScript origins and Authorized redirect URIs in Google Cloud Console.
2. Update your configuration to use environment variables for the Client ID to keep it secure.
3. Ensure your backend API is properly configured to validate Google tokens. 
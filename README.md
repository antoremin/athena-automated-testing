# 🤘 Welcome to Stagehand!

Hey! This is a project built with [Stagehand](https://github.com/browserbase/stagehand).

You can build your own web agent using: `npx create-browser-app`!

## Setting the Stage

Stagehand is an SDK for automating browsers. It's built on top of [Playwright](https://playwright.dev/) and provides a higher-level API for better debugging and AI fail-safes.

## Curtain Call

Get ready for a show-stopping development experience. Just run:

```bash
npm install && npm start
```

## What's Next?

### Add your API keys

Required API keys/environment variables are in the `.env.example` file. Copy it to `.env` and add your API keys.

```bash
cp .env.example .env && nano .env # Add your API keys to .env
```

### Custom .cursorrules

We have custom .cursorrules for this project. It'll help quite a bit with writing Stagehand easily.

### Run on Browserbase

To run on Browserbase, add your API keys to .env and change `env: "LOCAL"` to `env: "BROWSERBASE"` in [stagehand.config.ts](stagehand.config.ts).

### Use Anthropic Claude 3.5 Sonnet

1. Add your API key to .env
2. Change `modelName: "gpt-4o"` to `modelName: "claude-3-5-sonnet-latest"` in [stagehand.config.ts](stagehand.config.ts)
3. Change `modelClientOptions: { apiKey: process.env.OPENAI_API_KEY }` to `modelClientOptions: { apiKey: process.env.ANTHROPIC_API_KEY }` in [stagehand.config.ts](stagehand.config.ts)

# Athena Automated Testing

This project automates the login process for the Athena Intelligence platform using Stagehand and Playwright.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the `.env` file with your credentials:
     ```
     BROWSERBASE_PROJECT_ID="your_project_id"
     BROWSERBASE_API_KEY="your_api_key"
     ATHENA_USERNAME="your_athena_username"
     ATHENA_PASSWORD="your_athena_password"
     ```

3. Run the script:
   ```
   npm run start
   ```

## What the Script Does

The script performs the following actions:
1. Navigates to the Athena Intelligence login page
2. Fills in the login form with credentials from environment variables
3. Submits the form and waits for successful login
4. Handles potential timeouts by reloading the page if necessary

## Troubleshooting

If the script fails, it will:
1. Log the error to the console
2. Take a screenshot of the page at the time of failure (saved as `error-screenshot.png`)

## Security Note

Never commit your `.env` file to version control. The `.gitignore` file should already be configured to exclude it.

/**
 * 🤘 Welcome to Stagehand!
 *
 * TO RUN THIS PROJECT:
 * ```
 * npm install
 * npm run start
 * ```
 *
 * To edit config, see `stagehand.config.ts`
 *
 */
import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import chalk from "chalk";
import dotenv from "dotenv";
import { actWithCache, drawObserveOverlay, clearOverlays } from "./utils.js";

dotenv.config();

export async function main({
  page,
  context,
  stagehand,
}: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {
  try {
    // Configure browser context with stealth settings
    await context.addInitScript(() => {
      // Configure fingerprinting
      const fingerprint = {
        devices: ["desktop"],
        operatingSystems: ["windows"],
        browsers: ["chrome"],
        viewport: {
          width: 1920,
          height: 1080
        },
        locale: "en-US"
      };

      // Apply fingerprint settings
      Object.defineProperty(navigator, 'platform', { get: () => fingerprint.operatingSystems[0] });
      Object.defineProperty(navigator, 'language', { get: () => fingerprint.locale });
      
      // Listen for captcha solving events
      window.addEventListener('browserbase-solving-started', () => {
        console.log('Captcha solving started');
      });
      window.addEventListener('browserbase-solving-finished', () => {
        console.log('Captcha solving finished');
      });
    });

    // Navigate to the staging app and wait for network to be idle
    await page.goto("https://staging-app.athenaintel.com", {
      waitUntil: 'networkidle',
      timeout: 60000 // Increase timeout to 60 seconds
    });

    // Wait for the login form to be ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000); // Increased wait time to ensure React is hydrated

    // Fill in the username
    await page.act(
      "Type 'anton+staging+internal+bugbug@athenaintelligence.ai' into the email input field"
    );

    // Fill in the password
    await page.act(
      "Type '1Qwerty1Qwerty1' into the password input field"
    );

    // Click the login button
    await page.act(
      "Click the login button"
    );

    // Wait for navigation and page load after login with increased timeouts
    await Promise.all([
      page.waitForLoadState("networkidle", { timeout: 60000 }),
      page.waitForLoadState("domcontentloaded", { timeout: 60000 })
    ]);
    await page.waitForTimeout(5000); // Increased wait for React hydration

    // Click on Library
    await page.act(
      "Click the 'Library' link"
    );

    // Wait for navigation after clicking Library
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Scroll to the bottom of the page
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000); // Increased wait for scroll to complete

    // Click on "One Task for Each Agent"
    await page.act(
      "Click the link containing 'One Task for Each Agent'"
    );

    // Press Enter
    await page.keyboard.press('Enter');

    // Wait for 5 minutes (300000 milliseconds)
    await page.waitForTimeout(300000);

    // Take a screenshot
    await page.screenshot({
      path: 'one-task-for-each-agent.png',
      fullPage: true
    });
  } catch (error) {
    console.error('Test failed:', error);
    // Take a screenshot on failure
    await page.screenshot({
      path: 'error-screenshot.png',
      fullPage: true
    });
    throw error;
  }
}
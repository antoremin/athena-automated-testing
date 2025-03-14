import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

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
    // Parse command line arguments
    const args: Record<string, string> = {};
    process.argv.slice(2).forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        args[key] = value;
      }
    });
    
    // Default to 10 screenshots if not specified
    const numScreenshots = parseInt(args.num_screenshots || '10', 10);
    // Default to 60 seconds (1 minute) between screenshots if not specified
    const screenshotIntervalMs = parseInt(args.interval_ms || '60000', 10);
    
    console.log(`Configuration: Taking ${numScreenshots} screenshots with ${screenshotIntervalMs}ms interval`);
    
    // Set a higher viewport resolution
    await page.setViewportSize({
      width: 2560,
      height: 1440
    });
    
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    
    // Create output directory for analysis (will be used by Windmill script)
    const outputDir = path.join(process.cwd(), 'analysis');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Navigate to Athena with retry logic
    console.log("Navigating to Athena...");
    let retries = 3;
    while (retries > 0) {
      try {
        await page.goto("https://app.athenaintel.com/", { timeout: 60000 });
        console.log("Successfully navigated to Athena");
        break; // Break out of the loop if successful
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error("Failed to navigate to Athena after multiple attempts");
          throw error;
        }
        console.log(`Navigation failed, retrying... (${retries} attempts left)`);
        await page.waitForTimeout(5000); // Wait 5 seconds before retrying
      }
    }

    // Wait for the email input field to be visible
    await page.waitForSelector('input[autocomplete="email"]', { state: 'visible' });

    // Fill in the form with username and password from environment variables
    await page.act({
      action: "fill in the form with %username% and %password% and click the log in button",
      variables: {
        username: process.env.ATHENA_USERNAME!,
        password: process.env.ATHENA_PASSWORD!,
      },
    });

    // Wait for successful login and handle potential timeout
    try {
      await page.waitForSelector('h1.MuiBox-root', { state: 'visible', timeout: 10000 });
    } catch (error) {
      console.log("Element not found within 10 seconds. Reloading the page...");
      await page.reload(); // Reload the page
      await page.waitForSelector('h1.MuiBox-root', { state: 'visible' }); // Retry after reload
    }

    console.log("Successfully logged in to Athena");
    
    // Wait for the page to fully load after login
    await page.waitForLoadState('networkidle');
    
    // Click on Spaces
    console.log("Clicking on Spaces...");
    await page.act({
      action: "Click Spaces",
    });
    
    // Wait for navigation and content to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Additional wait to ensure content is loaded
    
    // Click the agent menu
    console.log("Switching the agent...");
    await page.act({
      action: "Find a dropdown on the top center of the page (with settings icon to the right) and click on the dropdown.",
    });

    // Click the agent menu
    console.log("Clicking on Athena agent... ");
    await page.act({
      action: "Find the Athena agent (the one that just says Athena) and click on it",
    });
    // Click the first suggested workflow below Documentation
    console.log("Clicking the first suggested workflow below Documentation...");
    await page.act({
      action: "Click the first suggested workflow below Documentation in the center space",
    });
    
    // Wait for navigation and content to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Additional wait to ensure content is loaded
    
    // Take screenshots at the specified interval
    console.log(`Starting to take ${numScreenshots} screenshots with ${screenshotIntervalMs}ms interval...`);
    
    const screenshotPaths: string[] = [];
    
    for (let i = 0; i < numScreenshots; i++) {
      // Take a screenshot with retry logic
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotPath = path.join(screenshotsDir, `screenshot-${i+1}-${timestamp}.png`);
      
      console.log(`Taking screenshot ${i+1}/${numScreenshots}...`);
      let screenshotRetries = 3;
      while (screenshotRetries > 0) {
        try {
          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
            timeout: 60000 // Increase timeout to 60 seconds
          });
          console.log(`Screenshot ${i+1}/${numScreenshots} taken: ${screenshotPath}`);
          break; // Break out of the loop if successful
        } catch (error) {
          screenshotRetries--;
          if (screenshotRetries === 0) {
            console.error(`Failed to take screenshot after multiple attempts`);
            throw error;
          }
          console.log(`Screenshot failed, retrying... (${screenshotRetries} attempts left)`);
          await page.waitForTimeout(5000); // Wait 5 seconds before retrying
        }
      }
      
      screenshotPaths.push(screenshotPath);
      
      // Wait before taking the next screenshot (unless it's the last one)
      if (i < numScreenshots - 1) {
        console.log(`Waiting ${screenshotIntervalMs}ms before taking next screenshot...`);
        await page.waitForTimeout(screenshotIntervalMs);
      }
    }
    
    console.log("All screenshots taken. Saving screenshot paths to file for Windmill processing...");
    
    // Save the screenshot paths to a file for the Windmill script to process
    fs.writeFileSync(
      path.join(outputDir, 'screenshot_paths.json'),
      JSON.stringify(screenshotPaths),
      'utf8'
    );
    
    console.log("Screenshot paths saved. Automation complete.");
    
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
import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";

dotenv.config();

// Function to convert image to base64
async function imageToBase64(filePath: string): Promise<string> {
  const imageBuffer = fs.readFileSync(filePath);
  return imageBuffer.toString('base64');
}

// Function to evaluate screenshots with Claude in a continuous conversation
async function evaluateScreenshotsWithClaude(
  screenshotPaths: string[],
  outputDir: string,
  model: ChatAnthropic
): Promise<{ annotations: string[], summary: string }> {
  try {
    console.log("Starting screenshot evaluation with Claude...");
    
    // Initialize conversation with system message
    const messages = [
      new SystemMessage(
        "You are an expert at analyzing screenshots of web applications. " +
        "You provide detailed observations about what you see and track progress across multiple screenshots. " +
        "If you see any errors, issues, or messages like 'I'm sorry but I can't process your request', flag them clearly."
      )
    ];
    
    const annotations: string[] = [];
    let conversationLog = "";
    
    // Process each screenshot in sequence, maintaining conversation context
    for (let i = 0; i < screenshotPaths.length; i++) {
      const screenshotPath = screenshotPaths[i];
      const screenshotFilename = path.basename(screenshotPath);
      console.log(`Processing screenshot ${i+1}/${screenshotPaths.length}: ${screenshotFilename}`);
      
      // Convert image to base64
      const base64Image = await imageToBase64(screenshotPath);
      
      // Create prompt based on whether this is the first screenshot or a subsequent one
      let promptText = "";
      if (i === 0) {
        promptText = "Evaluate this screenshot of a workflow and explain everything you see. If you see any errors, clearly state so.";
      } else {
        promptText = 
          "Analyze this new screenshot as well as the previous screenshots and annotations. " +
          "Check if the workflow is progressing well. " +
          "If you see any issues (errors, mistakes, messages like 'I'm sorry but I can't process your request'), flag them clearly. " +
          "Compare with previous screenshots to identify changes or progress.";
      }
      
      // Add human message with text and image
      messages.push(
        new HumanMessage({
          content: [
            {
              type: "text",
              text: promptText
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        })
      );
      
      // Get response from Claude
      const response = await model.call(messages);
      const annotation = response.content as string;
      
      // Add AI response to messages for context in next iteration
      messages.push(new AIMessage(annotation));
      
      // Store annotation
      annotations.push(annotation);
      
      // Add to conversation log with timestamp and screenshot reference
      conversationLog += `\n\n## Screenshot ${i+1}: ${screenshotFilename}\n`;
      conversationLog += `*Timestamp: ${new Date().toLocaleString()}*\n\n`;
      conversationLog += `### Analysis:\n${annotation}\n`;
      
      console.log(`Completed analysis of screenshot ${i+1}/${screenshotPaths.length}`);
    }
    
    // After all screenshots are processed, ask for a summary
    messages.push(
      new HumanMessage(
        "Based on all the screenshots you've analyzed, please provide a summary of the workflow execution. " +
        "Did the workflow run successfully? Were there any issues or errors? " +
        "Please format your response as a clear summary with bullet points for any issues found, " +
        "and reference the specific screenshots where issues were observed."
      )
    );
    
    // Get summary from Claude
    console.log("Generating workflow summary...");
    const summaryResponse = await model.call(messages);
    const summary = summaryResponse.content as string;
    
    // Add summary to conversation log
    conversationLog += `\n\n## Workflow Summary\n`;
    conversationLog += `*Generated on: ${new Date().toLocaleString()}*\n\n`;
    conversationLog += summary;
    
    // Save the complete conversation log
    fs.writeFileSync(
      path.join(outputDir, 'conversation_log.md'),
      conversationLog,
      'utf8'
    );
    
    console.log("Evaluation complete. Conversation log saved.");
    
    return { annotations, summary };
  } catch (error) {
    console.error(`Error evaluating screenshots with Claude: ${error}`);
    return { 
      annotations: ["Error evaluating screenshots: " + error], 
      summary: "Error generating summary: " + error 
    };
  }
}

// Function to save screenshot-annotation pairs and create HTML reports
async function createReports(
  screenshotPaths: string[],
  annotations: string[],
  summary: string,
  outputDir: string
): Promise<void> {
  try {
    console.log("Creating reports...");
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Process each screenshot and its annotation
    for (let i = 0; i < screenshotPaths.length; i++) {
      const screenshotPath = screenshotPaths[i];
      const annotation = annotations[i];
      const screenshotFilename = path.basename(screenshotPath);
      
      // Copy screenshot to output directory
      fs.copyFileSync(
        screenshotPath,
        path.join(outputDir, screenshotFilename)
      );
      
      // Save individual annotation to file
      const annotationFilename = screenshotFilename.replace('.png', '-annotation.md');
      fs.writeFileSync(
        path.join(outputDir, annotationFilename),
        annotation,
        'utf8'
      );
      
      console.log(`Saved screenshot and annotation for ${screenshotFilename}`);
    }
    
    // Save summary to file
    fs.writeFileSync(
      path.join(outputDir, 'workflow_summary.md'),
      summary,
      'utf8'
    );
    
    // Create an index.html file that shows all screenshots and links to the conversation log
    const indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Athena Workflow Analysis</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    h1, h2 { color: #333; }
    .timestamp { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .summary { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 30px; }
    .screenshot-list { display: flex; flex-wrap: wrap; gap: 20px; }
    .screenshot-item { border: 1px solid #ddd; padding: 15px; border-radius: 5px; width: 300px; }
    .screenshot-item img { max-width: 100%; }
    .screenshot-item h3 { margin-top: 0; }
    .links { margin-top: 30px; }
    .links a { display: block; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>Athena Workflow Analysis</h1>
  <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
  
  <div class="summary">
    <h2>Workflow Summary</h2>
    <div class="markdown-content">
      ${summary.replace(/\n/g, '<br>')}
    </div>
  </div>
  
  <h2>Screenshots</h2>
  <div class="screenshot-list">
    ${screenshotPaths.map((path, index) => {
      const filename = path.split('/').pop();
      const annotationFilename = filename?.replace('.png', '-annotation.md');
      return `
        <div class="screenshot-item">
          <h3>Screenshot ${index + 1}</h3>
          <img src="${filename}" alt="Screenshot ${index + 1}" style="max-height: 200px;">
          <p><a href="${annotationFilename}" target="_blank">View Analysis</a></p>
        </div>
      `;
    }).join('')}
  </div>
  
  <div class="links">
    <h2>Detailed Analysis</h2>
    <a href="conversation_log.md" target="_blank">View Complete Conversation Log</a>
    <a href="workflow_summary.md" target="_blank">View Workflow Summary</a>
  </div>
</body>
</html>
    `;
    
    fs.writeFileSync(
      path.join(outputDir, 'index.html'),
      indexHtml,
      'utf8'
    );
    
    console.log(`Reports created successfully in ${outputDir}`);
  } catch (error) {
    console.error(`Error creating reports: ${error}`);
  }
}

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
    
    // Create output directory for analysis
    const outputDir = path.join(process.cwd(), 'analysis');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Initialize Claude 3.7 model
    const claude = new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      modelName: "claude-3-7-sonnet-20250219",
    });

    // Navigate to Athena
    await page.goto("https://app.athenaintel.com/");

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
      action: " Find a dropdown on the top center of the page (with settings icon to the right) and click on the dropdown.",
    });

    // Click the agent menu
    console.log("Clicking on Athena agent... ");
    await page.act({
      action: "Find the Athena agent (the one that just says Athena) and click on it",
    });
    
    // Type in a custom prompt instead of clicking on a suggested workflow
    console.log("Typing in a custom prompt...");
    await page.act({
      action: "Find the input field or text area where you can type a prompt, click on it, and type: Install yfinance library, analyze apple financial performance, upload the table to athena, and write a report",
    });
    
    // Press Enter to submit the prompt
    console.log("Submitting the prompt...");
    await page.keyboard.press('Enter');
    
    // Wait for navigation and content to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshots every minute for 10 minutes (10 screenshots total)
    console.log("Starting to take screenshots every minute for 10 minutes...");
    
    const screenshotPaths: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      // Take a screenshot
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotPath = path.join(screenshotsDir, `screenshot-${i+1}-${timestamp}.png`);
      
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      
      console.log(`Screenshot ${i+1}/10 taken: ${screenshotPath}`);
      screenshotPaths.push(screenshotPath);
      
      // Wait for 1 minute before taking the next screenshot (unless it's the last one)
      if (i < 9) {
        console.log(`Waiting 1 minute before taking next screenshot...`);
        await page.waitForTimeout(60000); // 60000 ms = 1 minute
      }
    }
    
    console.log("All screenshots taken. Now evaluating with Claude...");
    
    // Evaluate screenshots with Claude (continuous conversation)
    const { annotations, summary } = await evaluateScreenshotsWithClaude(
      screenshotPaths,
      outputDir,
      claude
    );
    
    // Create reports with screenshots, annotations, and summary
    await createReports(
      screenshotPaths,
      annotations,
      summary,
      outputDir
    );
    
    console.log("Analysis complete. Results saved to:");
    console.log(`- Conversation Log: ${path.join(outputDir, 'conversation_log.md')}`);
    console.log(`- Workflow Summary: ${path.join(outputDir, 'workflow_summary.md')}`);
    console.log(`- HTML Report: ${path.join(outputDir, 'index.html')}`);
    
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
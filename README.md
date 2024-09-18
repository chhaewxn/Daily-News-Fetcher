# 📰 Daily News Fetcher Daily News Fetcher and Trend Report Generator

## Overview
This project consists of two main components:

**(1) Daily News Fetcher**
: An automated news collection and summarization system developed using Google Apps Script.

**(2) Trend Report Generator**
: A system that analyzes accumulated news data and generates monthly trend reports.

Both components work together to provide comprehensive insights into specific industry trends and developments.

## Key Features
1. Multi-source news collection (Google News, Energy News Korea)
2. Keyword-based news filtering
3. News summarization using OpenAI GPT model
4. Email dispatch (card news format for daily news, PDF report for monthly trends)
5. Data storage and management using Google Sheets
6. Monthly trend analysis and report generation

## Technical Stack
- Google Apps Script
- XML parsing (XmlService)
- OpenAI GPT API
- Google Sheets API
- Gmail API
- HTML and CSS for email templates and PDF generation

## Script Breakdown
### Daily News Fetcher
### (1) News Summarization
This function uses the OpenAI GPT API to summarize news content. It sends a structured prompt to the API and handles the response, including error management.

```javascript
function fetchSummary(prompt) {
  var url = "https://api.openai.com/v1/chat/completions";
  var headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  };

  var payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        "role": "system",
        "content": "You are a professional news summarization AI. Summarize the given article according to the following guidelines:\n1. Summarize the main facts and claims of the article in paragraph form.\n2. Use relevant industry terms and expertise, but write in natural Korean.\n3. Summarize objectively without bias.\n4. Write each sentence concisely and clearly.\n5. Limit the entire summary to 200 characters."
      },
      {
        "role": "user",
        "content": prompt
      }
    ],
    temperature: 1
  };

  var options = {
    "method": "post",
    "headers": headers,
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    return json.choices[0].message.content.trim();
  } catch (e) {
    Logger.log('Error fetching summary: ' + e);
    return 'Error fetching summary';
  }
}
```

### (2) Duplicate Article Detection
These functions implement Jaccard similarity to detect duplicate articles. The jaccardSimilarity function calculates the similarity between two strings, while isArticleDuplicate uses this to check if a new article is similar to any existing ones.

```javascript
function jaccardSimilarity(str1, str2) {
  var set1 = new Set(str1.toLowerCase().split(/\s+/));
  var set2 = new Set(str2.toLowerCase().split(/\s+/));
  var intersection = new Set([...set1].filter(x => set2.has(x)));
  var union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

function isArticleDuplicate(newArticle, existingArticles) {
  for (var i = 0; i < existingArticles.length; i++) {
    var existingArticle = existingArticles[i];
    if (jaccardSimilarity(newArticle.title.toLowerCase(), existingArticle.title.toLowerCase()) > 0.15 || 
        jaccardSimilarity(newArticle.description.toLowerCase(), existingArticle.description.toLowerCase()) > 0.15) {
      return true; 
    }
  }
  return false;
}
```

### (3) Keyword Management
These functions fetch keyword sets and exclusion keywords from Google Sheets. This approach allows for flexible keyword management without modifying the code.

```javascript
function fetchKeywordSets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("KeywordSets_v1");
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  
  var keywordSets = [];
  for (var i = 1; i < values.length; i++) {
    var keyword1 = values[i][0].toString().trim();
    var keyword2 = values[i][1].toString().trim();
    if (keyword1 !== "") {
      keywordSets.push([keyword1, keyword2]);
    }
  }
  
  return keywordSets;
}

function fetchExcludeKeywords() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Exclude Keywords");
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  
  var excludeKeywords = [];
  for (var i = 1; i < values.length; i++) {
    var keyword = values[i][0].toString().trim().toLowerCase();
    if (keyword !== "") {
      excludeKeywords.push(keyword);
    }
  }
  
  return excludeKeywords;
}
```

### (4) Email Generation and Sending
This function generates an HTML email with a card-based layout for each news item, grouped by keywords. It uses inline CSS for maximum email client compatibility.

```javascript
function sendEmailWithCardNews(subject, recipient, newsData) {
  var today = new Date();
  var dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy년 MM월 dd일");

  // Group news by keywords
  var newsGroups = {};
  for (var i = 1; i < newsData.length; i++) {
    var key = newsData[i][1] + (newsData[i][2] ? ' ' + newsData[i][2] : '');
    if (!newsGroups[key]) {
      newsGroups[key] = [];
    }
    newsGroups[key].push(newsData[i]);
  }

  // HTML template and card news generation
  var htmlTemplate = `...`; // HTML template code
  var cardNews = '';
  for (var key in newsGroups) {
    cardNews += `...`; // Card news HTML generation
  }

  var htmlBody = htmlTemplate.replace('{dateString}', dateString).replace('{cardNews}', cardNews);

  var guidelineImageId = "1AOA_Qu5FfxlF4xVrJy935Q-NZz05bSSa";
  var guidelineImage = DriveApp.getFileById(guidelineImageId).getBlob().setName("KeywordSets_Guideline.png");

  var emailOptions = {
    to: recipient,
    subject: subject,
    htmlBody: htmlBody,
    attachments: [guidelineImage]
  };

  MailApp.sendEmail(emailOptions);
}
```

### (5) News Fetching and Processing
This function fetches news from multiple sources, filters them based on keywords and exclusion criteria, checks for duplicates, and summarizes the content.
```javascript
function fetchNewsFeed() {
  var keywordSets = fetchKeywordSets();
  var excludeKeywords = fetchExcludeKeywords();
  var now = new Date();
  var updateTime = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

  var rows = [];
  rows.push(["Update Time", "Keyword", "Keyword", "Title of News", "Link to News Article", "News Summary", "Date of Publication"]);

  var today = new Date();
  var endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 59, 59);
  var startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 0, 0);

  var existingArticles = [];

  for (var i = 0; i < keywordSets.length; i++) {
    var keyword1 = keywordSets[i][0];
    var keyword2 = keywordSets[i][1];

    var urls = [
      'https://www.energy-news.co.kr/rss/allArticle.xml',
      `https://news.google.com/rss/search?q=${encodeURIComponent(keyword1)}+${encodeURIComponent(keyword2)}&hl=ko&gl=KR&ceid=KR:ko`
    ];

    // Fetch and process news from each URL
    // ... (code for fetching, parsing XML, filtering, and summarizing news)
  }

  return rows;
}
```

### Trend Report Generator
### (1) Report Generation and Emailing
This function generates an HTML report, converts it to PDF, and emails it to recipients.
```javascript
function generateAndEmailTrendReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var reportSheet = ss.getSheetByName("Trend Report");
  
  if (!reportSheet) {
    Logger.log("Trend Report sheet not found");
    return;
  }

  var reportData = reportSheet.getDataRange().getValues();
  var dateString = getFormattedDateString();
  var htmlContent = generateHTMLReport(reportData, dateString);

  var pdfBlob = generatePDF(htmlContent);
  sendEmailWithPDF(pdfBlob, htmlContent, dateString);
}
```
### (2) HTML Report Generation
This function creates an HTML template for the trend report, structuring the content into sections.
```javascript
function generateHTMLReport(reportData, dateString) {
  var html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${dateString} 동향 분석 및 전망 보고서</title>
      <style>
        /* ... CSS styles ... */
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${dateString} 동향 분석 및 전망 보고서</h1>
        <p class="date">${reportData[1][0]}</p>
  `;

  // ... Content generation logic ...

  html += "</div></body></html>";
  return html;
}
```

### (3) PDF Generation
This function converts the HTML content to a PDF file.
```javascript
function generatePDF(htmlContent) {
  var blob = Utilities.newBlob(htmlContent, 'text/html', 'report.html');
  var pdf = DriveApp.createFile(blob).getAs('application/pdf');
  pdf.setName("동향 분석 및 전망 보고서.pdf");
  return pdf;
}
```

### (4) News Analysis and Report Generation
This function analyzes the accumulated news data and generates a trend report.
```javascript
function analyzeNewsAndGenerateReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var keywordSheet = ss.getSheetByName("KeywordSets");
  var cumulativeNewsSheet = ss.getSheetByName("Cumulative News");
  var reportSheet = ss.getSheetByName("Trend Report");
  
  // ... Data processing and analysis logic ...

  generateAndEmailTrendReport();
}
```
### (5) Category Analysis
This function uses the OpenAI API to analyze news data for each category and generate insights.
```javascript
function analyzeCategory(category, news) {
  var prompt = `다음은 ${category} 관련 누적된 뉴스 기사 데이터입니다:\n\n`;
  // ... Prompt construction ...

  var response = callOpenAI(prompt);
  var parsedResponse = parseJSONResponse(response);
  
  return {
    trends: Array.isArray(parsedResponse.trends) ? parsedResponse.trends : [],
    issues: Array.isArray(parsedResponse.issues) ? parsedResponse.issues : [],
    forecast: typeof parsedResponse.forecast === 'string' ? parsedResponse.forecast : "전망 데이터 없음",
    relatedNews: Array.isArray(parsedResponse.relatedNews) ? parsedResponse.relatedNews : []
  };
}
```

## Technical Details
### XML Parsing
The script uses XmlService to parse RSS feeds. This allows for efficient extraction of news data from structured XML responses.

### Rate Limiting and Error Handling
```javascript
var maxRetries = 2;
for (var attempt = 0; attempt < maxRetries; attempt++) {
  try {
    response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    if (responseCode === 200) {
      break;
    }
  } catch (e) {
    Logger.log('Error fetching URL: ' + e);
  }
  Utilities.sleep(4000 * (attempt + 1));
}
```
The script implements exponential backoff for retries and includes error logging for troubleshooting.

### Data Storage
News data is stored in Google Sheets, allowing for easy access and analysis:
```javascript
var cumulativeRange = cumulativeSheet.getRange(cumulativeSheet.getLastRow() + 1, 1, rows.length - 1, headers.length);
cumulativeRange.setValues(rows.slice(1).map(formatRow));
```

### Scalability Considerations
- The script uses batch operations when interacting with Google Sheets to minimize API calls.
- News processing is done in memory to avoid excessive read/write operations.

### Setup and Usage
1. Set up sheets in Google Sheets: "KeywordSets", "Exclude Keywords", "Email Recipient Test", "Cumulative News", "Trend Report".
2. Configure the OpenAI API key in the script properties.
3. Add the code to a Google Apps Script project.
4. Set up time-based triggers for both the news fetching and trend report generation functions.

### Limitations and Considerations
- API usage limits: Monitor OpenAI API usage and associated costs.
- Execution time: Google Apps Script has a maximum execution time of 6 minutes per run.
- RSS feed limitations: Some news sources may limit access or change their RSS structure.

## Conclusion
The combination of the Daily News Fetcher and Trend Report Generator creates a powerful system for monitoring and analyzing industry trends. By automating the collection, summarization, and analysis of news data, it provides valuable insights to stakeholders, enhancing their decision-making capabilities in rapidly evolving industries.

## Limitations and Considerations
- API usage limits: Monitor OpenAI API usage and associated costs.
- Execution time: Google Apps Script has a maximum execution time of 6 minutes per run.
- RSS feed limitations: Some news sources may limit access or change their RSS structure.

## Future Enhancements
- Implement more advanced natural language processing techniques for better trend analysis.
- Add interactive elements to the PDF report, such as clickable links and expandable sections.
- Develop a web interface for real-time monitoring of trends and manual adjustment of the analysis.
- Implement machine learning models for predictive analytics based on historical trend data.


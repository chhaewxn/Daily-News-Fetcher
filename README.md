# 📰 Daily News Fetcher

## Introduction
This NewsFetcher script is designed to automate the process of gathering, summarizing, and disseminating energy transition-related news articles. By leveraging Google Apps Script, OpenAI's GPT-3.5-turbo model, and various RSS feeds, this tool efficiently compiles relevant news and delivers a daily digest to the designated recipients.

## Features
### (1) Automated News Fetching:

The script retrieves news articles from multiple RSS feeds, including Google News, Energy News Korea, and the Ministry of Trade, Industry, and Energy (MOTIE).
Keywords related to energy transition and relevant companies are used to filter and fetch specific news articles.

### (2) News Summarization:

OpenAI's GPT-3.5-turbo model is used to summarize the fetched news articles.
The summarization follows specific guidelines to ensure the output is concise, relevant, and professional. // 여기서 CoT 전략을 활용한 프롬프트엔지니어링 파트 추가하기 

### (3) Duplicate Article Detection:

A Jaccard Similarity model is employed to identify and eliminate duplicate articles based on the title and description of the news.
The similarity threshold is set to 0.3 to ensure only unique articles are included.

### (4) Email Notification:

A daily email summarizing the fetched news is sent to the designated recipients.
The email includes a formatted HTML table containing the keywords, news titles, summaries, publication dates, and links to the full articles.
Additional content and links to the cumulative Google Sheet are provided for easy reference.

### (5) Data Management:

News articles are organized and stored in two Google Sheets: "Cumulative News" for all fetched articles and "Daily News" for the current day's articles.
Headers are standardized, and the sheets are updated daily.

## Script Breakdown
### 1. News Fetching
The fetchNewsFeed function is the core of the script, responsible for retrieving news articles from the specified RSS feeds based on a predefined set of keywords.

```javascript
function fetchNewsFeed() {
  // Array of keyword sets
  var keywordSets = [
    ["에어리퀴드"],
    ["GS", "칼텍스"],
    // Additional keywords...
  ];

  // Initialize an array to store the rows of data
  var rows = [];
  rows.push(["Update Time", "Keyword", "Keyword", "Title of News", "Link to News Article", "News Summary", "Date of Publication"]);

  // Loop through each set of keywords and fetch news articles
  for (var i = 0; i < keywordSets.length; i++) {
    var keyword1 = keywordSets[i][0];
    var keyword2 = keywordSets[i][1];
    var urls = [
      `https://news.google.com/rss/search?q=${encodeURIComponent(keyword1)}+${encodeURIComponent(keyword2)}&hl=ko&gl=KR&ceid=KR:ko`,
      'https://www.energy-news.co.kr/rss/allArticle.xml',
      'https://www.motie.go.kr/kor/article/ATCL3f49a5a8c/rss'
    ];

    // Fetch articles from each URL
    for (var u = 0; u < urls.length; u++) {
      var response = UrlFetchApp.fetch(urls[u]);
      if (response.getResponseCode() === 200) {
        var document = XmlService.parse(response.getContentText());
        var items = document.getRootElement().getChild("channel").getChildren("item");

        for (var j = 0; j < items.length; j++) {
          var article = items[j];
          var title = article.getChild("title").getText();
          var link = article.getChild("link").getText();
          var description = article.getChild("description").getText();
          var pubDate = new Date(article.getChild("pubDate").getText());

          // Check for duplicates and relevance
          if (!isArticleDuplicate({ title, description }) && (title.includes(keyword1) && title.includes(keyword2) || description.includes(keyword1) && description.includes(keyword2))) {
            var summary = fetchSummary(description);
            rows.push([Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm"), keyword1, keyword2, title, link, summary, Utilities.formatDate(pubDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm")]);
          }
        }
      }
    }
  }
  return rows;
}
```

### 2. News Summarization
The fetchSummary function calls the OpenAI API to generate summaries for the news articles.

```javascript
function fetchSummary(prompt, ass_msg = `당신은 전문적인 뉴스 요약 AI입니다. 주어진 기사를 다음 지침에 따라 요약해 주세요: ...`, model="gpt-3.5-turbo") {
  var url = "https://api.openai.com/v1/chat/completions";
  var headers = {
    "Authorization": "Bearer sk-xxx", // Replace with actual API key
    "Content-Type": "application/json"
  };

  var payload = {
    model: model,
    messages: [{ "role": "system", content: ass_msg }, { "role": "user", content: prompt }],
    temperature: 1
  };

  var options = {
    "method": "post",
    "headers": headers,
    "payload": JSON.stringify(payload)
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

### 3. Duplicate Detection
The isArticleDuplicate function uses the Jaccard Similarity model to identify duplicate articles.

```javascript
function jaccardSimilarity(str1, str2) {
  var set1 = new Set(str1.split(/\s+/));
  var set2 = new Set(str2.split(/\s+/));
  var intersection = new Set([...set1].filter(x => set2.has(x)));
  var union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

function isArticleDuplicate(newArticle, existingArticles) {
  for (var i = 0; i < existingArticles.length; i++) {
    if (jaccardSimilarity(newArticle.title, existingArticles[i].title) > 0.5 || jaccardSimilarity(newArticle.description, existingArticles[i].description) > 0.5) {
      return true;
    }
  }
  return false;
}
```

### 4. Email Notification
The sendEmailWithTable function formats the news data into an HTML table and sends it via email.

```javascript
function sendEmailWithTable(subject, recipient, tableData) {
  var today = new Date();
  var dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy년 MM월 dd일");

  var tableStyle = 'border-collapse: collapse; width: 100%;';
  var thStyle = 'background-color: #f0f0f0; font-weight: bold; border: 2px solid #ddd; padding: 8px; text-align: left;';
  var tdStyle = 'border: 1px solid #ddd; padding: 8px;';

  var htmlTable = '<table style="' + tableStyle + '">';
  htmlTable += '<tr><th style="' + thStyle + '">Keyword</th><th style="' + thStyle + '">Title of News</th><th style="' + thStyle + '">News Summary</th><th style="' + thStyle + '">Date of Publication</th><th style="' + thStyle + '">Link to News Article</th></tr>';

  for (var i = 1; i < tableData.length; i++) {
    htmlTable += '<tr>';
    htmlTable += '<td style="' + tdStyle + '">' + tableData[i][1] + ' ' + tableData[i][2] + '</td>';
    htmlTable += '<td style="' + tdStyle + '">' + tableData[i][3] + '</td>';
    htmlTable += '<td style="' + tdStyle + '">' + tableData[i][5] + '</td>';
    htmlTable += '<td style="' + tdStyle + '">' + tableData[i][6] + '</td>';
    htmlTable += '<td style="' + tdStyle + '"><a href="' + tableData[i][4] + '">Link</a></td>';
    htmlTable += '</tr>';
  }
  htmlTable += '</table>';

  var additionalContent = '<p> 부가 설명 작성하기 </p>';

  var emailOptions = {
    to: recipient,
    subject: subject + dateString,
    htmlBody: htmlTable + additionalContent
  };

  MailApp.sendEmail(emailOptions);
}
```

## Conclusion
The NewsFetcher script streamlines the process of collecting, summarizing, and disseminating energy transition-related news. By automating these tasks, it ensures timely and relevant information delivery to stakeholders, enhancing their awareness and decision-making capabilities.

## Next Steps
### Testing and Debugging:

Thoroughly test the script to identify and resolve any issues.
Ensure the script handles different scenarios gracefully (e.g., empty RSS feeds, API errors).

### Customization:

Customize the keywords, RSS feeds, and email recipients as needed.
Adjust the summarization and duplicate detection thresholds based on feedback.

### Deployment:

Schedule the script to run daily using Google Apps Script triggers.
Monitor the script's performance and make adjustments as necessary.
This documentation provides a comprehensive overview of the NewsFetcher script, enabling you to understand its functionality, customize it to your needs, and ensure its smooth operation.



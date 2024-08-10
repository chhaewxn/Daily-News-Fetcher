function fetchSummary(prompt) {
  var url = "https://api.openai.com/v1/chat/completions";
  var headers = {
    "Authorization": "Bearer sk-xxx", // Replace with actual API key
    "Content-Type": "application/json"
  };

  var payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        "role": "system",
        "content": "당신은 전문적인 뉴스 요약 AI입니다. 주어진 기사를 다음 지침에 맞게 요약해 주세요:\n1. 기사의 주요 사실과 주장을 줄글로 요약하세요.\n2. 관련 산업 용어와 전문 지식을 사용하되, 자연스러운 한국어로 작성하세요.\n3. 편향되지 않게 객관적으로 요약하세요.\n4. 각 문장을 간결하고 명확하게 작성하세요.\n5. 전체 요약글은 200자 이내로 제한하세요."
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
    var summary = json.choices[0].message.content.trim();
    return summary;
  } catch (e) {
    Logger.log('Error fetching summary: ' + e);
    return 'Error fetching summary';
  }
}

// 자카드 유사도 모델 계산 함수 - 기준 수치는 변경 필요
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

// 키워드셋 반영하는 시트 별도로 분리하기 
function fetchKeywordSets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("KeywordSets_v1");
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  
  var keywordSets = [];
  for (var i = 1; i < values.length; i++) {  // 첫 번째 행은 건너뛰기 
    var keyword1 = values[i][0].toString().trim();
    var keyword2 = values[i][1].toString().trim();
    if (keyword1 !== "") {  // keyword1이 비어있지 않은 경우에만 추가
      keywordSets.push([keyword1, keyword2]);
    }
  }
  
  return keywordSets;
}

// 키워드셋 업데이트 트리거 설정 
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() === "KeywordSets") {
    // KeywordSets 시트가 수정되었을 때 실행할 코드
    Logger.log("KeywordSets updated");
  }
}

// 디버깅 테스트 시, SheetByName은 Recipient Email Test로 설정하기 
function getEmailRecipients() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Email Recipient Test");
  var lastRow = sheet.getLastRow();
  var emailRange = sheet.getRange("B2:B" + lastRow);
  var emailValues = emailRange.getValues();

  var recipient = [];
  for (var i = 0; i < emailValues.length; i++) {
    if (emailValues[i][0] !== "") {
      recipient.push(emailValues[i][0]);
    } else {
      break; // 빈 셀을 만나면 루프 종료
    }
  }

  return recipient.join(", ");
}

function sendEmailWithCardNews(subject, recipient, newsData) {
  var today = new Date();
  var dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy년 MM월 dd일");

  // 키워드별로 뉴스 그룹화
  var newsGroups = {};
  for (var i = 1; i < newsData.length; i++) {
    var key = newsData[i][1] + (newsData[i][2] ? ' ' + newsData[i][2] : '');
    if (!newsGroups[key]) {
      newsGroups[key] = [];
    }
    newsGroups[key].push(newsData[i]);
  }

  // HTML 템플릿
  var htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <h1 style="color: #333; text-align: center; margin-bottom: 30px; font-size: 24px;">{dateString} Daily News Fetcher ✉</h1>
      {cardNews}
      <div style="margin-top: 30px; font-size: 12px; color: #666; background-color: #fff; padding: 20px; border-radius: 8px;">
        <p>지난 뉴스 피드를 모아볼 수 있는 Google Sheet 링크는 <a href="https://docs.google.com/spreadsheets/d/1wWi2EnSLBcWj6P137w0wEjJDfFdpySy39hA_Q4z31Ok/edit?usp=sharing" style="color: #007bff; text-decoration: none;">여기</a>에서 확인하실 수 있습니다.</p>
        <p>첨부된 이미지 파일을 통해 News Fetcher의 추가할 수 있는 KeywordSets Sheet Guideline을 확인하실 수 있습니다.</p>
        <p>추가 기능 요청이나 개선 사항이 있으시면 언제든지 chaewon.song@airliquide.com으로 연락해 주시기 바랍니다.</p>
        <p>더 나은 News Fetcher 서비스를 제공하기 위해 적극적으로 반영하겠습니다.</p>
        <p>행복한 하루 보내시길 바랍니다! 😀</p>
      </div>
    </div>
  `;

  // 카드 뉴스 HTML 생성
  var cardNews = '';
  for (var key in newsGroups) {
    cardNews += `
      <div style="margin-bottom: 20px; background-color: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background-color: #f0f0f0; color: #333; padding: 8px 15px; font-size: 16px; font-weight: bold;">
          ${key}
        </div>
        <div style="padding: 15px;">
    `;
    
    newsGroups[key].forEach(function(news) {
      cardNews += `
        <div style="border-bottom: 1px solid #eee; padding: 12px 0;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #333;">${news[3]}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${news[5]}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <a href="${news[4]}" style="color: #007bff; text-decoration: none; font-size: 12px; margin-right: 15px;">Link to News</a>
            <div style="font-size: 11px; color: #999; flex-shrink: 0;">${news[6]}</div>
          </div>
        </div>
      `;
    });
    
    cardNews += `
        </div>
      </div>
    `;
  }

  // HTML 템플릿에 데이터 삽입
  var htmlBody = htmlTemplate.replace('{dateString}', dateString).replace('{cardNews}', cardNews);

  var guidelineImageId = "1AOA_Qu5FfxlF4xVrJy935Q-NZz05bSSa";
  var guidelineImage = DriveApp.getFileById(guidelineImageId).getBlob().setName("KeywordSets_Guideline.png");

  var emailOptions = {
    to: recipient,
    subject: subject,
    htmlBody: htmlBody,
    attachments: [guidelineImage]
  };

  // 이메일 보내기
  MailApp.sendEmail(emailOptions);
}

function fetchAndCategorizeNews() {
  var rows = fetchNewsFeed();

  if (rows && rows.length > 1) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var cumulativeSheet = ss.getSheetByName("Cumulative News");
    var dailySheet = ss.getSheetByName("Daily News");

    if (!cumulativeSheet) {
      Logger.log("Cumulative News sheet not found. Creating new sheet.");
      cumulativeSheet = ss.insertSheet("Cumulative News");
    }

    if (!dailySheet) {
      Logger.log("Daily News sheet not found. Creating new sheet.");
      dailySheet = ss.insertSheet("Daily News");
    }

    // 헤더 행 수정
    var headers = ["Updated Date", "Keyword", "Keyword", "Title of News", "News Summary", "Date of Publication", "Link to News Article"];
    
    // 누적 시트 업데이트
    cumulativeSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var cumulativeRange = cumulativeSheet.getRange(cumulativeSheet.getLastRow() + 1, 1, rows.length - 1, headers.length);
    cumulativeRange.setValues(rows.slice(1).map(formatRow));

    // 일일 시트 초기화 및 업데이트
    dailySheet.clear();
    dailySheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var dailyRange = dailySheet.getRange(2, 1, rows.length - 1, headers.length);
    dailyRange.setValues(rows.slice(1).map(formatRow));

    Logger.log('Articles successfully added to both sheets');

    // 이메일 전송
    var today = new Date();
    var dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy년 MM월 dd일");
    var subject = dateString + ' Daily News Fetcher ✉';

    var recipient = getEmailRecipients();
    sendEmailWithCardNews(subject, recipient, rows);

  } else {
    Logger.log('No articles meeting the criteria were found');
  }
}

function formatRow(row) {
  // Updated Date 형식 변경 (년-월-일)
  var updatedDate = Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd");
  return [updatedDate, row[1], row[2], row[3], row[5], row[6], row[4]];
}

function fetchExcludeKeywords() { //제외 키워드 가져오는 함수 
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Exclude Keywords");
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  
  var excludeKeywords = [];
  for (var i = 1; i < values.length; i++) {  // 첫 번째 행은 건너뛰기 
    var keyword = values[i][0].toString().trim().toLowerCase();
    if (keyword !== "") {
      excludeKeywords.push(keyword);
    }
  }
  
  return excludeKeywords;
}

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

    // Google News RSS Feed
    var googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword1)}+${encodeURIComponent(keyword2)}&hl=ko&gl=KR&ceid=KR:ko`;

    // Energy News Korea RSS Feed
    var energyNewsUrl = 'https://www.energy-news.co.kr/rss/allArticle.xml';

    // 중앙일보 RSS Feed
    // var joinNewsUrl = 'http://rss.joinsmsn.com/joins_it_list.xml';

    // 산업자원통상부 RSS Feed
    // var motieNewsUrl = 'https://www.motie.go.kr/kor/article/ATCL3f49a5a8c/rss';

    // 연합뉴스 RSS Feed 
    // var ynaNewsUrl = 'https://www.yna.co.kr/rss/news.xml';

    var urls = [energyNewsUrl, googleNewsUrl];

    // 추가 헤더 설정 
    var options = {
      "method": "get",
      "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      },
      "muteHttpExceptions": true
    };

    for (var u = 0; u < urls.length; u++) {
      var url = urls[u];

      var response = null;
      var maxRetries = 2;
      for (var attempt = 0; attempt < maxRetries; attempt++) {
        try {
          response = UrlFetchApp.fetch(url, options); // 여기서 options 사용하기 
          var responseCode = response.getResponseCode();
          Logger.log('Response Code: ' + responseCode);
          if (responseCode === 200) {
            Logger.log(response.getContentText()); // Logging of response content
            break;
          } else {
            Logger.log('Failed with response code: ' + responseCode + ' on attempt: ' + (attempt + 1));
          }
        } catch (e) {
          Logger.log('Error fetching URL: ' + e);
        }
        Utilities.sleep(4000 * (attempt + 1));
      }

      if (!response || response.getResponseCode() !== 200) {
        Logger.log('Failed to fetch articles for URL: ' + url + ' after ' + maxRetries + ' attempts.');
      }

      if (response && response.getResponseCode() === 200) {
        var xml = response.getContentText();
        xml = xml.replace(/<meta[^>]*>/g, ''); //
        var document = XmlService.parse(xml);
        var items = document.getRootElement().getChild("channel").getChildren("item");

        for (var j = 0; j < items.length; j++) {
          var article = items[j];
          var title = article.getChild("title").getText();
          var link = article.getChild("link").getText();
          var description = article.getChild("description").getText();
          var pubDate = new Date(article.getChild("pubDate").getText());
          var dateStr = Utilities.formatDate(pubDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

          var newArticle = { title: title, description: description };

          var shouldExclude = excludeKeywords.some(function(excludeKeyword) {
            return title.toLowerCase().includes(excludeKeyword) || description.toLowerCase().includes(excludeKeyword);
          });

          if (!shouldExclude && pubDate >= startTime && pubDate <= endTime && !isArticleDuplicate(newArticle, existingArticles) && (title.toLowerCase().includes(keyword1.toLowerCase()) && title.toLowerCase().includes(keyword2.toLowerCase()) || description.toLowerCase().includes(keyword1.toLowerCase()) && description.toLowerCase().includes(keyword2.toLowerCase()))) {
            var summary = fetchSummary(description);
            rows.push([updateTime, keyword1, keyword2, title, link, summary, dateStr]);
            existingArticles.push(newArticle);
          }
        }
      } else {
        Logger.log('Failed to fetch articles for URL: ' + url + ' after ' + maxRetries + ' attempts.');
      }
    }
  }

  return rows;
}
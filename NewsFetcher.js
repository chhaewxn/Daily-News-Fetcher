function fetchSummary(prompt) {
  var url = "https://api.openai.com/v1/chat/completions";
  var headers = {
    "Authorization": "Bearer sk-xxx", // Replace with actual API key
    "Content-Type": "application/json"
  };

  var payload = {
    model: "gpt-3.5-turbo",
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
    "payload": JSON.stringify(payload)
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    var summary = json.choices[0].message.content.trim();
    return summary;
  } catch (e) {
    Logger.log('Error fetching summary: ' + e);
    return 'Error fetching summary';
  } // prompt 수정
}

// // 코사인 유사도 모델 계산 함수 
// function tokenize(text) {
//   return text.toLowerCase().match(/\b\w+\b/g);
// }

// function termFrequency(term, tokens) {
//   var count = 0;
//   for (var i = 0; i < tokens.length; i++) {
//     if (tokens[i] === term) {
//       count++;
//     }
//   }
//   return count / tokens.length;
// }

// function termFrequencyVector(tokens) {
//   var tfVector = {};
//   var uniqueTokens = Array.from(new Set(tokens));
//   for (var i = 0; i < uniqueTokens.length; i++) {
//     tfVector[uniqueTokens[i]] = termFrequency(uniqueTokens[i], tokens);
//   }
//   return tfVector;
// }

// function dotProduct(vec1, vec2) {
//   var keys = Object.keys(vec1);
//   var product = 0;
//   for (var i = 0; i < keys.length; i++) {
//     if (vec2[keys[i]]) {
//       product += vec1[keys[i]] * vec2[keys[i]];
//     }
//   }
//   return product;
// }

// function magnitude(vec) {
//   var sum = 0;
//   var keys = Object.keys(vec);
//   for (var i = 0; i < keys.length; i++) {
//     sum += vec[keys[i]] * vec[keys[i]];
//   }
//   return Math.sqrt(sum);
// }

// function cosineSimilarity(str1, str2) {
//   var tokens1 = tokenize(str1);
//   var tokens2 = tokenize(str2);
//   var tfVector1 = termFrequencyVector(tokens1);
//   var tfVector2 = termFrequencyVector(tokens2);

//   var dotProd = dotProduct(tfVector1, tfVector2);
//   var mag1 = magnitude(tfVector1);
//   var mag2 = magnitude(tfVector2);

//   return dotProd / (mag1 * mag2);
// }

// function isArticleDuplicate(newArticle, existingArticles) {
//   for (var i = 0; i < existingArticles.length; i++) {
//     var existingArticle = existingArticles[i];
//     if (cosineSimilarity(newArticle.title, existingArticle.title) > 0.8 || 
//         cosineSimilarity(newArticle.description, existingArticle.description) > 0.8) {
//       return true; 
//     }
//   }
//   return false;
// }

// 자카드 유사도 모델 계산 함수 - 기준 수치는 변경 필요
function jaccardSimilarity(str1, str2) { // Jaccard Similarity Model
  var set1 = new Set(str1.split(/\s+/));
  var set2 = new Set(str2.split(/\s+/));
  var intersection = new Set([...set1].filter(x => set2.has(x)));
  var union = new Set([...set1, ...set2]);
  return intersection.size / union.size; // Calculate the ratio of intersaction to union
}

function isArticleDuplicate(newArticle, existingArticles) {
  for (var i = 0; i < existingArticles.length; i++) {
    var existingArticle = existingArticles[i];
    if (jaccardSimilarity(newArticle.title, existingArticle.title) > 0.2 || 
        jaccardSimilarity(newArticle.description, existingArticle.description) > 0.2) {
      return true; 
    }
  }
  return false;
}

function sendEmailWithTable(subject, recipient, tableData) {
  // 현재 날짜 가져오기
  var today = new Date();
  var dateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy년 MM월 dd일");

  // 테이블 스타일 정의 - 표의 헤더 디자인 추가 
  var tableStyle = 'border-collapse: collapse; width: 100%;';
  var thStyle = 'background-color: #f0f0f0; font-weight: bold; border: 2px solid #ddd; padding: 8px; text-align: left;';
  var tdStyle = 'border: 1px solid #ddd; padding: 8px;';

  // 테이블 데이터를 HTML 테이블 형식으로 변환
  var htmlTable = '<table style="' + tableStyle + '">';
  
  // 테이블 헤더 추가
  htmlTable += '<tr>';
  htmlTable += '<th style="' + thStyle + '">Keyword</th>';
  htmlTable += '<th style="' + thStyle + '">Title of News</th>';
  htmlTable += '<th style="' + thStyle + '">News Summary</th>';
  htmlTable += '<th style="' + thStyle + '">Date of Publication</th>';
  htmlTable += '<th style="' + thStyle + '">Link to News Article</th>';
  htmlTable += '</tr>';
  
  // 테이블 데이터 추가 (첫 번째 행은 헤더이므로 건너뜁니다)
  for (var i = 1; i < tableData.length; i++) {
    htmlTable += '<tr>';
    // Keyword (두 번째와 세 번째 열에서 keyword 결합)
    htmlTable += '<td style="' + tdStyle + '">' + tableData[i][1] + ' ' + tableData[i][2] + '</td>';
    // Title of News
    htmlTable += '<td style="' + tdStyle + '">' + tableData[i][3] + '</td>';
    // News Summary
    htmlTable += '<td style="' + tdStyle + '">' + tableData[i][5] + '</td>';
    // Date of Publication
    htmlTable += '<td style="' + tdStyle + '">' + tableData[i][6] + '</td>';
    // Link to News Article
    htmlTable += '<td style="' + tdStyle + '"><a href="' + tableData[i][4] + '">Link</a></td>';
    htmlTable += '</tr>';
  }
  htmlTable += '</table>';

 // 관련 링크와 추가 문구
  var additionalContent = '<p>지난 뉴스 피드를 모아볼 수 있는 Google Sheet 링크는 '+'<a href="https://docs.google.com/spreadsheets/d/1wWi2EnSLBcWj6P137w0wEjJDfFdpySy39hA_Q4z31Ok/edit?usp=sharing">여기</a>'+'에서 확인하실 수 있습니다.</p>'
+ '<p>추가 기능 요청이나 개선 사항이 있으시면 언제든지 chaewon.song@airliquide.com으로 연락해 주시기 바랍니다.</p>'
+ '<p>더 나은 NewsFetcher 서비스를 제공하기 위해 적극적으로 반영하겠습니다.</p>'
+ '<p>행복한 하루 보내시길 바랍니다.</p>'

  var emailOptions = {
    to: recipient,
    subject: subject,
    htmlBody: '<p>' + dateString + ' Daily News Fetcher</p>' + htmlTable + additionalContent
  };

  // 이메일 보내기
  MailApp.sendEmail(emailOptions);
}

function createCharts(sheet, dataRange) { //
  var chartBuilder = sheet.newChart();
  chartBuilder.addRange(dataRange)
    .setChartType(Charts.ChartType.COLUMN)
    .setPosition(2, 7, 0, 0)
    .setOption('title', 'Number of Articles by keyword')
    .build();
  
  sheet.insertChart(chartBuilder.build());
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
    var subject = dateString + ' Daily News Summary';
    
    // 부서원 전체에게 보내는 메일 
    // var recipient = 'jason.ahn@airliquide.com, sewon.lee@airliquide.com, joungho.an@airliquide.com, jaeeun.kim@airliquide.com, yeyoung.yi@airliquide.com, jongnam.won@airliquide.com, jinkyu.song@airliquide.com, hang-real.ko@airliquide.com, chaewon.song@airliquide.com, chaewon1019@ewhain.net';

    // 테스트용 내 메일  
    var recipient = 'chaewon.song@airliquide.com, chaewon1019@ewhain.net';
    sendEmailWithTable(subject, recipient, rows);

  } else {
    Logger.log('No articles meeting the criteria were found');
  }
}

function formatRow(row) {
  // Updated Date 형식 변경 (년-월-일)
  var updatedDate = Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd");
  return [updatedDate, row[1], row[2], row[3], row[5], row[6], row[4]];
}

function fetchNewsFeed() {
  var keywordSets = [
    ["에어리퀴드", " "],
    ["GS", "칼텍스"],
    ["롯데케미칼", " "],
    ["LG", "화학"],
    ["한화", "솔루션"],
    ["한화", "에너지"],
    ["포스코", "에너지"],
    ["SK", "E&S"],
    ["SK", "이노베이션"],
    ["한양", "에너지"],
    ["여천", "NCC"],
    ["덕양", "에너지"],
    ["SPG", " "],
    ["린데", " "],
    ["에어프로덕츠", " "],
    ["대성산업가스", " "],
    ["에어퍼스트", " "],
    ["바스프", " "],
    ["TDI", " "],
    ["MDI"," "],
    ["Benzene", " "],
    ["Toluene", " "],
    ["한국가스공사", "천연가스"],
    ["한국가스공사", "도시가스"],
    ["한국전력", "전기요금"],
    ["암모니아", "크랙킹"],
    ["블루", "암모니아"],
    ["그린", "암모니아"],
    ["블루", "수소"],
    ["그린", "수소"],
    ["CCS", "셰퍼드"],
    ["에너지전환", " "]   
  ];

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
    var motieNewsUrl = 'https://www.motie.go.kr/kor/article/ATCL3f49a5a8c/rss';

    var urls = [energyNewsUrl, googleNewsUrl, motieNewsUrl];

    for (var u = 0; u < urls.length; u++) {
      var url = urls[u];

      var response = null;
      var maxRetries = 2;
      for (var attempt = 0; attempt < maxRetries; attempt++) {
        try {
          response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
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
        Utilities.sleep(2000 * (attempt + 1));
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

          if (pubDate >= startTime && pubDate <= endTime && !isArticleDuplicate(newArticle, existingArticles) &&
          (title.includes(keyword1) && title.includes(keyword2) || description.includes(keyword1) && description.includes(keyword2))) {
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

function getFormattedDateString() {
    var today = new Date();
    var lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    var year = lastMonth.getFullYear();
    var month = lastMonth.getMonth() + 1; // JavaScript의 월은 0부터 시작하므로 1을 더합니다.
    
    return year + "년 " + month + "월";
  }
  
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
  
  function generateHTMLReport(reportData, dateString) {
    var html = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${dateString} 동향 분석 및 전망 보고서</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
          h1 { color: #333; border-bottom: 2px solid #666; padding-bottom: 10px; font-size: 24px; }
          h2 { color: #444; margin-top: 30px; font-size: 20px; }
          .date { color: #666; font-style: italic; font-size: 14px; }
          .section { margin-bottom: 20px; background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
          .section-title { font-weight: bold; color: #333; font-size: 16px; margin-bottom: 10px; }
          ul { padding-left: 20px; margin: 0; }
          li { margin-bottom: 5px; color: #444; font-size: 14px; }
          a { color: #1a73e8; text-decoration: none; }
          a:hover { text-decoration: underline; }
          p { color: #444; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${dateString} 동향 분석 및 전망 보고서</h1>
          <p class="date">${reportData[1][0]}</p>
    `;
  
    var currentCategory = "";
    var currentSection = "";
  
    for (var i = 3; i < reportData.length; i++) {
      var row = reportData[i];
      
      if (row[0] && row[0].endsWith("동향 분석")) {
        if (currentCategory) {
          html += "</div>";  // Close previous category
        }
        currentCategory = row[0].replace(" 동향 분석", "");
        html += `<h2>${currentCategory}</h2><div class="category">`;
      } else if (row[0] === "주요 트렌드:" || row[0] === "주요 이슈:" || row[0] === "향후 전망:" || row[0] === "관련 주요 뉴스:") {
        if (currentSection) {
          html += `</ul></div>`;  // Close previous section
        }
        currentSection = row[0];
        html += `<div class="section"><p class="section-title">${currentSection}</p><ul>`;
      } else if (row[1]) {
        if (currentSection === "관련 주요 뉴스:") {
          var newsInfo = row[1].split(' | ');
          if (newsInfo.length >= 2) {
            var newsTitle = newsInfo[0];
            var newsLink = newsInfo[1];
            var newsImportance = newsInfo[2] || "";
            html += `<li>${newsTitle} (<a href="${newsLink}" target="_blank">Link to News</a>)<br>중요도: ${newsImportance}</li>`;
          } else {
            html += `<li>${row[1]}</li>`;
          }
        } else {
          html += `<li>${row[1].startsWith("•") ? row[1].substring(1).trim() : row[1]}</li>`;
        }
      }
    }
  
    // Close any open sections and categories
    if (currentSection) {
      html += `</ul></div>`;
    }
    if (currentCategory) {
      html += "</div>";
    }
  
    html += "</div></body></html>";
    return html;
  }
  
  function generatePDF(htmlContent) {
    var blob = Utilities.newBlob(htmlContent, 'text/html', 'report.html');
    var pdf = DriveApp.createFile(blob).getAs('application/pdf');
    pdf.setName("동향 분석 및 전망 보고서.pdf");
    return pdf;
  }
  
  function getLiRecipients() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("LI Recipient Email");
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
  
  
  function sendEmailWithPDF(pdfBlob, htmlContent, dateString) {
    var recipients = getLiRecipients(); 
    
    var emailBody = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; border-bottom: 2px solid #666; padding-bottom: 10px; font-size: 20px; }
          .intro { background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .intro p { margin: 0 0 10px; font-size: 12px; color: #444; }
          .report-preview { background-color: #ffffff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .report-preview h2 { color: #444; font-size: 16px; margin-top: 0; }
          .footer { margin-top: 20px; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${dateString} 동향 분석 및 전망 보고서</h1>
          <div class="intro">
            <p>안녕하세요,</p>
            <p>${dateString} 동향 분석 및 전망 보고서를 첨부하여 보내드립니다.</p>
            <p>본 보고서는 ${dateString} 누적된 뉴스 데이터를 바탕으로 AI가 분석한 결과입니다.</p>
          </div>
          <div class="report-preview">
            <h2>보고서 미리보기</h2>
            ${htmlContent}
          </div>
          <div class="footer">
            <p>더 자세한 내용은 첨부된 PDF 파일을 확인해 주세요.</p>
            <p>추가 문의사항이 있으시면 언제든 연락 주시기 바랍니다.</p>
            <p>감사합니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  
    MailApp.sendEmail({
      to: recipients,
      subject: `${dateString} 동향 분석 및 전망 보고서`,
      htmlBody: emailBody,
      attachments: [pdfBlob]
    });
  }
  
  function analyzeNewsAndGenerateReport() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var keywordSheet = ss.getSheetByName("KeywordSets");
    var cumulativeNewsSheet = ss.getSheetByName("Cumulative News");
    var reportSheet = ss.getSheetByName("Trend Report");
    
    if (!reportSheet) {
      reportSheet = ss.insertSheet("Trend Report");
    }
  
    var keywordData = keywordSheet.getDataRange().getValues();
    var newsData = cumulativeNewsSheet.getDataRange().getValues();
  
    var categories = ["화학 물질", "차세대 에너지 기술", "에너지 정책"];
    var categoryKeywords = {};
    categories.forEach(category => categoryKeywords[category] = []);
  
    // 카테고리별 키워드 분류
    for (var i = 1; i < keywordData.length; i++) {
      var category = keywordData[i][2];
      if (categories.includes(category)) {
        categoryKeywords[category].push(keywordData[i][0]);
        if (keywordData[i][1]) {
          categoryKeywords[category].push(keywordData[i][1]);
        }
      }
    }
  
    var categoryNews = {};
    categories.forEach(category => categoryNews[category] = []);
  
    // 이전 달의 시작일과 끝일 계산
    var today = new Date();
    var lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    var lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  
    // 이전 달의 누적 뉴스 데이터만 분류
    for (var i = 1; i < newsData.length; i++) {
      var newsKeywords = newsData[i][1] + " " + newsData[i][2];
      var newsTitle = newsData[i][3];
      var newsSummary = newsData[i][4];
      var newsLink = newsData[i][6];
      var newsDateStr = newsData[i][5];
      var newsDate = new Date(newsDateStr);
  
      // 이전 달의 뉴스만 필터링
      if (newsDate >= lastMonthStart && newsDate <= lastMonthEnd) {
        for (var category in categoryKeywords) {
          if (categoryKeywords[category].some(keyword => newsKeywords.toLowerCase().includes(keyword.toLowerCase()))) {
            categoryNews[category].push({
              title: newsTitle,
              summary: newsSummary,
              link: newsLink,
              date: newsDateStr,
            });
            break;
          }
        }
      }
    }
  
    // 보고서 생성 및 포맷팅
    var dateString = getFormattedDateString();
    reportSheet.clear();
    reportSheet.getRange("A1").setValue(dateString + " 누적 동향 분석 및 전망 보고서").setFontWeight("bold").setFontSize(14);
    reportSheet.getRange("A2").setValue("생성 일시: " + new Date().toLocaleString());
  
    var rowIndex = 4;
    for (var category in categoryNews) {
      Logger.log("카테고리 " + category + "의 누적 뉴스 수: " + categoryNews[category].length);
      
      if (categoryNews[category].length > 0) {
        reportSheet.getRange(rowIndex, 1).setValue(category + " 동향 분석").setFontWeight("bold").setFontSize(12);
        rowIndex++;
  
        var analysis = analyzeCategory(category, categoryNews[category]);
        
        // 주요 트렌드
        if (analysis.trends && analysis.trends.length > 0) {
          reportSheet.getRange(rowIndex, 1).setValue("주요 트렌드:").setFontWeight("bold");
          analysis.trends.forEach(trend => {
            rowIndex++;
            reportSheet.getRange(rowIndex, 2).setValue("• " + trend);
          });
          rowIndex += 2;
        }
  
        // 주요 이슈
        if (analysis.issues && analysis.issues.length > 0) {
          reportSheet.getRange(rowIndex, 1).setValue("주요 이슈:").setFontWeight("bold");
          analysis.issues.forEach(issue => {
            rowIndex++;
            reportSheet.getRange(rowIndex, 2).setValue("• " + issue);
          });
          rowIndex += 2;
        }
  
        // 향후 전망
        if (analysis.forecast) {
          reportSheet.getRange(rowIndex, 1).setValue("향후 전망:").setFontWeight("bold");
          rowIndex++;
          reportSheet.getRange(rowIndex, 2).setValue(analysis.forecast);
          rowIndex += 2;
        }
  
        // 관련 주요 뉴스
        if (analysis.relatedNews && analysis.relatedNews.length > 0) {
          reportSheet.getRange(rowIndex, 1).setValue("관련 주요 뉴스:").setFontWeight("bold");
          analysis.relatedNews.forEach(news => {
            rowIndex++;
            if (news.title && news.link) {
              var newsInfo = `${news.title} | ${news.link} | ${news.importance}`;
              reportSheet.getRange(rowIndex, 2).setValue(newsInfo);
            }
          });
        }
  
        rowIndex += 3; // 카테고리 간 간격 추가
      }
    }
  
    // 열 너비 자동 조정
    reportSheet.autoResizeColumns(1, 2);
  
    generateAndEmailTrendReport();
  } 
  
  function analyzeCategory(category, news) {
    var prompt = `다음은 ${category} 관련 누적된 뉴스 기사 데이터입니다:\n\n`;
    news.forEach(item => {
      prompt += `제목: ${item.title}\n요약: ${item.summary}\n날짜: ${item.date}\n링크: ${item.link}\n\n`;
    });
    prompt += `위 정보를 기반으로 ${category}의 최근 동향성과 향후 전망에 대해서 체계적이고 객관적으로 분석하고, 다음 JSON 형식으로 정확히 응답해주세요:
    {
      "trends": ["트렌드1", "트렌드2", "트렌드3"],
      "issues": ["이슈1", "이슈2", "이슈3"],
      "forecast": "향후 전망에 대한 1-2 문단의 상세한 텍스트",
      "relatedNews": [
        {"title": "뉴스 제목1", "link": "뉴스 링크1", "importance": "이 뉴스가 중요한 이유"},
        {"title": "뉴스 제목2", "link": "뉴스 링크2", "importance": "이 뉴스가 중요한 이유"},
        {"title": "뉴스 제목3", "link": "뉴스 링크3", "importance": "이 뉴스가 중요한 이유"}
      ]
    }
  
    분석 시 다음 사항을 고려해 주세요:
    1. 장기적인 산업 변화와 기술 발전 트렌드
    2. 정책 및 규제 변화의 영향
    3. 시장 동향 및 경쟁 구도의 변화
    4. 새로운 기회와 잠재적 위험 요소
  
    주요 뉴스는 다음 기준으로 선정해주세요:
    1. 해당 분야에 미치는 영향력의 크기
    2. 뉴스의 시사성 및 최신성
    3. 장기적인 산업 변화를 예측할 수 있는 정보 포함 여부
    각 항목에 대해 최소 3개 이상의 구체적이고 상세한 내용을 제공해주세요. 다른 텍스트나 설명 없이 오직 이 JSON 형식으로만 응답해주세요.`;
  
    var response = callOpenAI(prompt);
    Logger.log("AI 응답 (카테고리: " + category + "): " + response);
    var parsedResponse = parseJSONResponse(response);
    Logger.log("파싱된 응답 (카테고리: " + category + "): " + JSON.stringify(parsedResponse));
   
    return {
      trends: Array.isArray(parsedResponse.trends) ? parsedResponse.trends : [],
      issues: Array.isArray(parsedResponse.issues) ? parsedResponse.issues : [],
      forecast: typeof parsedResponse.forecast === 'string' ? parsedResponse.forecast : "전망 데이터 없음",
      relatedNews: Array.isArray(parsedResponse.relatedNews) ? parsedResponse.relatedNews : []
    };
  }
  
  function callOpenAI(prompt) {
    var apiUrl = "https://api.openai.com/v1/chat/completions";
    var apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
    var headers = {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    };
    
    var payload = {
      "model": "gpt-4o-mini",
      "messages": [{"role": "user", "content": prompt}],
      "temperature": 0.85
    };
  
    var options = {
      "method": "post",
      "headers": headers,
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
  
    try {
      var response = UrlFetchApp.fetch(apiUrl, options);
      var responseText = JSON.parse(response.getContentText());
      return responseText.choices[0].message.content;
    } catch (e) {
      Logger.log("API 호출 오류: " + e);
      return null;
    }
  }
  
  function parseJSONResponse(response) {
    // 마크다운 코드 블록 제거
    response = response.replace(/```json/g, '').replace(/```/g, '');
    
    // 앞뒤 공백 제거
    response = response.trim();
    
    // JSON 파싱 시도
    try {
      return JSON.parse(response);
    } catch (e) {
      Logger.log("JSON 파싱 실패: " + e);
      Logger.log("원본 응답: " + response);
      return {
        trends: [],
        issues: [],
        forecast: "데이터 파싱 오류",
        relatedNews: []
      };
    }
  }  
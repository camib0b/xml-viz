(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  function createElement(tagName, className) {
    var element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    return element;
  }

  function appendHeading(parentElement, titleText) {
    var heading = createElement("h2", "section-heading");
    heading.textContent = titleText;
    parentElement.appendChild(heading);
  }

  function renderTagCountTable(parentElement, countSummary) {
    appendHeading(parentElement, "Tag counts");
    var summaryLine = createElement("p", "summary-line");
    summaryLine.textContent =
      countSummary.totalInstanceCount + " tagged instances across " + countSummary.tagCounts.length + " tag types.";
    parentElement.appendChild(summaryLine);

    var table = createElement("table", "data-table");
    var headerRow = createElement("tr");
    ["Tag", "Color", "Count"].forEach(function (columnTitle) {
      var headerCell = createElement("th");
      headerCell.textContent = columnTitle;
      headerRow.appendChild(headerCell);
    });
    table.appendChild(headerRow);

    countSummary.tagCounts.forEach(function (tagCount) {
      var row = createElement("tr");
      var codeCell = createElement("td");
      codeCell.textContent = tagCount.code;
      row.appendChild(codeCell);

      var colorCell = createElement("td");
      var swatch = createElement("span", "color-swatch");
      swatch.style.backgroundColor = tagCount.cssColor;
      swatch.title = tagCount.cssColor;
      colorCell.appendChild(swatch);
      row.appendChild(colorCell);

      var countCell = createElement("td");
      countCell.textContent = String(tagCount.count);
      row.appendChild(countCell);

      table.appendChild(row);
    });
    parentElement.appendChild(table);
  }

  function renderLabelGroupTable(parentElement, countSummary) {
    appendHeading(parentElement, "Label groups");
    var table = createElement("table", "data-table");
    var headerRow = createElement("tr");
    ["Group", "Text", "Count"].forEach(function (columnTitle) {
      var headerCell = createElement("th");
      headerCell.textContent = columnTitle;
      headerRow.appendChild(headerCell);
    });
    table.appendChild(headerRow);

    countSummary.labelGroupCounts.forEach(function (labelCount) {
      var row = createElement("tr");
      var groupCell = createElement("td");
      groupCell.textContent = labelCount.groupName;
      row.appendChild(groupCell);

      var textCell = createElement("td");
      textCell.textContent = labelCount.text;
      row.appendChild(textCell);

      var countCell = createElement("td");
      countCell.textContent = String(labelCount.count);
      row.appendChild(countCell);

      table.appendChild(row);
    });
    parentElement.appendChild(table);
  }

  function renderTimelineAxis(axisElement, timeline) {
    var axisLabels = createElement("div", "timeline-axis-labels");
    var startLabel = createElement("span");
    startLabel.textContent = timeline.axisStartLabel;
    var endLabel = createElement("span");
    endLabel.textContent = timeline.axisEndLabel;
    axisLabels.appendChild(startLabel);
    axisLabels.appendChild(endLabel);
    axisElement.appendChild(axisLabels);

    var tickRow = createElement("div", "timeline-tick-row");
    timeline.axisTicks.forEach(function (tick) {
      var tickMarker = createElement("div", "timeline-tick");
      tickMarker.style.left = tick.positionPercent + "%";
      var tickLabel = createElement("span");
      tickLabel.textContent = tick.label;
      tickMarker.appendChild(tickLabel);
      tickRow.appendChild(tickMarker);
    });
    axisElement.appendChild(tickRow);
  }

  function renderTimelineLanes(lanesContainer, timeline) {
    timeline.lanes.forEach(function (lane) {
      var laneRow = createElement("div", "timeline-lane");
      var laneLabel = createElement("div", "timeline-lane-label");
      laneLabel.textContent = lane.code;
      laneRow.appendChild(laneLabel);

      var laneTrack = createElement("div", "timeline-lane-track");
      lane.bars.forEach(function (bar) {
        var barElement = createElement("div", "timeline-bar");
        barElement.style.left = bar.leftPercent + "%";
        barElement.style.width = bar.widthPercent + "%";
        barElement.style.backgroundColor = bar.cssColor;
        barElement.title = bar.tooltip;
        laneTrack.appendChild(barElement);
      });
      laneRow.appendChild(laneTrack);
      lanesContainer.appendChild(laneRow);
    });
  }

  function renderTagTimeline(parentElement, analysisDocument) {
    appendHeading(parentElement, "Tag timeline");
    var timeline = xmlViz.buildTagTimeline(analysisDocument);
    var timelineSection = createElement("div", "timeline-section");
    var axisElement = createElement("div", "timeline-axis");
    renderTimelineAxis(axisElement, timeline);
    timelineSection.appendChild(axisElement);

    var scrollContainer = createElement("div", "timeline-scroll");
    var lanesContainer = createElement("div", "timeline-lanes");
    renderTimelineLanes(lanesContainer, timeline);
    scrollContainer.appendChild(lanesContainer);
    timelineSection.appendChild(scrollContainer);
    parentElement.appendChild(timelineSection);
  }

  function renderVisualization(parentElement, analysisDocument) {
    parentElement.textContent = "";
    var countSummary = xmlViz.countTags(analysisDocument);
    renderTagCountTable(parentElement, countSummary);
    renderLabelGroupTable(parentElement, countSummary);
    renderTagTimeline(parentElement, analysisDocument);
  }

  xmlViz.renderVisualization = renderVisualization;
})(typeof window !== "undefined" ? window : globalThis);

(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  var MINIMUM_BAR_WIDTH_PERCENT = 0.15;
  var AXIS_TICK_INTERVAL_SECONDS = 600;

  function findTimeBounds(taggedInstances) {
    var minimumStart = Infinity;
    var maximumEnd = -Infinity;
    for (var index = 0; index < taggedInstances.length; index += 1) {
      var instance = taggedInstances[index];
      if (instance.startSeconds < minimumStart) {
        minimumStart = instance.startSeconds;
      }
      if (instance.endSeconds > maximumEnd) {
        maximumEnd = instance.endSeconds;
      }
    }
    if (!Number.isFinite(minimumStart) || !Number.isFinite(maximumEnd)) {
      return { timelineStartSeconds: 0, timelineEndSeconds: 1 };
    }
    if (maximumEnd <= minimumStart) {
      return { timelineStartSeconds: minimumStart, timelineEndSeconds: minimumStart + 1 };
    }
    return {
      timelineStartSeconds: minimumStart,
      timelineEndSeconds: maximumEnd,
    };
  }

  function buildAxisTicks(timelineStartSeconds, timelineEndSeconds) {
    var ticks = [];
    var firstTick =
      Math.ceil(timelineStartSeconds / AXIS_TICK_INTERVAL_SECONDS) *
      AXIS_TICK_INTERVAL_SECONDS;
    for (
      var tickSeconds = firstTick;
      tickSeconds <= timelineEndSeconds;
      tickSeconds += AXIS_TICK_INTERVAL_SECONDS
    ) {
      var span = timelineEndSeconds - timelineStartSeconds;
      var positionPercent = ((tickSeconds - timelineStartSeconds) / span) * 100;
      ticks.push({
        positionPercent: positionPercent,
        label: xmlViz.formatSecondsAsClock(tickSeconds),
      });
    }
    return ticks;
  }

  function formatLabelSummary(labels) {
    if (labels.length === 0) {
      return "No labels";
    }
    return labels
      .map(function (label) {
        return label.groupName + ": " + label.text;
      })
      .join("; ");
  }

  function buildBarGeometry(
    taggedInstance,
    timelineStartSeconds,
    timelineSpanSeconds,
    cssColor
  ) {
    var leftPercent =
      ((taggedInstance.startSeconds - timelineStartSeconds) / timelineSpanSeconds) * 100;
    var widthPercent =
      ((taggedInstance.endSeconds - taggedInstance.startSeconds) / timelineSpanSeconds) *
      100;
    var displayWidthPercent = Math.max(widthPercent, MINIMUM_BAR_WIDTH_PERCENT);
    var durationSeconds = taggedInstance.endSeconds - taggedInstance.startSeconds;
    var tooltip =
      "ID " +
      taggedInstance.instanceId +
      " | " +
      xmlViz.formatSecondsAsClock(taggedInstance.startSeconds) +
      " – " +
      xmlViz.formatSecondsAsClock(taggedInstance.endSeconds) +
      " (" +
      durationSeconds.toFixed(1) +
      "s) | " +
      formatLabelSummary(taggedInstance.labels);
    return {
      leftPercent: leftPercent,
      widthPercent: displayWidthPercent,
      cssColor: cssColor,
      tooltip: tooltip,
      instanceId: taggedInstance.instanceId,
    };
  }

  function buildTagTimeline(analysisDocument) {
    var countSummary = xmlViz.countTags(analysisDocument);
    var bounds = findTimeBounds(analysisDocument.taggedInstances);
    var timelineStartSeconds = bounds.timelineStartSeconds;
    var timelineEndSeconds = bounds.timelineEndSeconds;
    var timelineSpanSeconds = timelineEndSeconds - timelineStartSeconds;
    var colorLookup = {};
    for (var colorIndex = 0; colorIndex < analysisDocument.codeColors.length; colorIndex += 1) {
      var codeColor = analysisDocument.codeColors[colorIndex];
      colorLookup[codeColor.code] = xmlViz.codeColorToCssRgb(codeColor);
    }

    var instancesByCode = {};
    for (var instanceIndex = 0; instanceIndex < analysisDocument.taggedInstances.length; instanceIndex += 1) {
      var taggedInstance = analysisDocument.taggedInstances[instanceIndex];
      if (!instancesByCode[taggedInstance.code]) {
        instancesByCode[taggedInstance.code] = [];
      }
      instancesByCode[taggedInstance.code].push(taggedInstance);
    }

    var lanes = countSummary.tagCounts.map(function (tagCount) {
      var instances = instancesByCode[tagCount.code] || [];
      instances.sort(function (left, right) {
        return left.startSeconds - right.startSeconds;
      });
      var bars = instances.map(function (instance) {
        return buildBarGeometry(
          instance,
          timelineStartSeconds,
          timelineSpanSeconds,
          tagCount.cssColor
        );
      });
      return {
        code: tagCount.code,
        cssColor: tagCount.cssColor,
        bars: bars,
      };
    });

    return {
      timelineStartSeconds: timelineStartSeconds,
      timelineEndSeconds: timelineEndSeconds,
      axisStartLabel: xmlViz.formatSecondsAsClock(timelineStartSeconds),
      axisEndLabel: xmlViz.formatSecondsAsClock(timelineEndSeconds),
      axisTicks: buildAxisTicks(timelineStartSeconds, timelineEndSeconds),
      lanes: lanes,
    };
  }

  xmlViz.buildTagTimeline = buildTagTimeline;
})(typeof window !== "undefined" ? window : globalThis);

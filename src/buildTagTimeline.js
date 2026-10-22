(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  var MINIMUM_BAR_WIDTH_PERCENT = 0.15;
  var FALLBACK_AXIS_LABEL_WIDTH_PIXELS = 40;
  var FALLBACK_AXIS_LABEL_GAP_PIXELS = 12;
  var NICE_AXIS_INTERVALS_SECONDS = [
    60,
    120,
    300,
    600,
    900,
    1800,
    3600,
    7200,
  ];

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

  function resolvePositivePixels(value, fallbackPixels) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
    return fallbackPixels;
  }

  function timelineSpanSeconds(timelineStartSeconds, timelineEndSeconds) {
    var spanSeconds = timelineEndSeconds - timelineStartSeconds;
    if (!(spanSeconds > 0)) {
      return 1;
    }
    return spanSeconds;
  }

  function chooseNiceAxisIntervalSeconds(minimumIntervalSeconds) {
    for (var index = 0; index < NICE_AXIS_INTERVALS_SECONDS.length; index += 1) {
      var intervalSeconds = NICE_AXIS_INTERVALS_SECONDS[index];
      if (intervalSeconds + 1e-9 >= minimumIntervalSeconds) {
        return intervalSeconds;
      }
    }
    return null;
  }

  function firstNiceTickSeconds(timelineStartSeconds, intervalSeconds) {
    var quotient = timelineStartSeconds / intervalSeconds;
    var alignedSeconds = Math.ceil(quotient - 1e-9) * intervalSeconds;
    if (alignedSeconds < timelineStartSeconds - 1e-6) {
      alignedSeconds += intervalSeconds;
    }
    return alignedSeconds;
  }

  function buildTimelineAxisTicks(
    timelineStartSeconds,
    timelineEndSeconds,
    trackWidthPixels,
    labelWidthPixels,
    labelGapPixels
  ) {
    var spanSeconds = timelineSpanSeconds(timelineStartSeconds, timelineEndSeconds);
    var resolvedLabelWidth = resolvePositivePixels(
      labelWidthPixels,
      FALLBACK_AXIS_LABEL_WIDTH_PIXELS
    );
    var resolvedGap = resolvePositivePixels(labelGapPixels, FALLBACK_AXIS_LABEL_GAP_PIXELS);
    var roundingSlackPixels = 1;
    var minimumTrackWidthPixels = resolvedLabelWidth * 2 + resolvedGap + roundingSlackPixels;
    var ticks = [
      {
        seconds: timelineStartSeconds,
        positionPercent: 0,
        label: xmlViz.formatSecondsAsClock(timelineStartSeconds),
        placement: "start",
      },
    ];
    var intervalSeconds = null;
    var trackWidth = resolvePositivePixels(trackWidthPixels, 0);

    if (trackWidth > 0) {
      var minimumSpacingPixels = resolvedLabelWidth + resolvedGap + roundingSlackPixels;
      var minimumIntervalSeconds = (minimumSpacingPixels / trackWidth) * spanSeconds;
      intervalSeconds = chooseNiceAxisIntervalSeconds(minimumIntervalSeconds);
    }

    if (intervalSeconds !== null && trackWidth > 0) {
      var edgePaddingPixels =
        resolvedLabelWidth + resolvedGap + roundingSlackPixels + resolvedLabelWidth / 2;
      var interiorStartPixels = edgePaddingPixels;
      var interiorEndPixels = trackWidth - edgePaddingPixels;
      var firstTickSeconds = firstNiceTickSeconds(timelineStartSeconds, intervalSeconds);
      var maximumTickCount =
        Math.ceil(spanSeconds / intervalSeconds) + 2;
      for (var tickIndex = 0; tickIndex < maximumTickCount; tickIndex += 1) {
        var tickSeconds = firstTickSeconds + tickIndex * intervalSeconds;
        if (tickSeconds <= timelineStartSeconds + 1e-6) {
          continue;
        }
        if (tickSeconds >= timelineEndSeconds - 1e-6) {
          break;
        }
        var positionPixels = ((tickSeconds - timelineStartSeconds) / spanSeconds) * trackWidth;
        if (positionPixels < interiorStartPixels || positionPixels > interiorEndPixels) {
          continue;
        }
        ticks.push({
          seconds: tickSeconds,
          positionPercent: (positionPixels / trackWidth) * 100,
          label: xmlViz.formatSecondsAsClock(tickSeconds),
          placement: "center",
        });
      }
    }

    ticks.push({
      seconds: timelineEndSeconds,
      positionPercent: 100,
      label: xmlViz.formatSecondsAsClock(timelineEndSeconds),
      placement: "end",
    });

    return {
      intervalSeconds: intervalSeconds,
      labelWidthPixels: resolvedLabelWidth,
      gapPixels: resolvedGap,
      minimumTrackWidthPixels: minimumTrackWidthPixels,
      ticks: ticks,
    };
  }

  function formatLabelSummary(labels) {
    if (!labels || labels.length === 0) {
      return "No labels";
    }
    var parts = [];
    for (var index = 0; index < labels.length; index += 1) {
      var label = labels[index];
      if (!label) {
        continue;
      }
      var text = label.text == null ? "" : String(label.text).replace(/[\r\n]+/g, " ").trim();
      if (!text) {
        continue;
      }
      var groupName =
        label.groupName == null ? "" : String(label.groupName).replace(/[\r\n]+/g, " ").trim();
      parts.push(groupName ? groupName + ": " + text : text);
    }
    if (parts.length === 0) {
      return "No labels";
    }
    return parts.join("; ");
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
    var durationLabel = Number.isFinite(durationSeconds)
      ? durationSeconds.toFixed(1) + "s"
      : "unknown duration";
    var tooltip =
      "ID " +
      taggedInstance.instanceId +
      " | " +
      xmlViz.formatSecondsAsClock(taggedInstance.startSeconds) +
      " – " +
      xmlViz.formatSecondsAsClock(taggedInstance.endSeconds) +
      " (" +
      durationLabel +
      ") | " +
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
      axisTicks: buildTimelineAxisTicks(timelineStartSeconds, timelineEndSeconds, 0, 0, 0).ticks,
      lanes: lanes,
    };
  }

  xmlViz.buildTimelineAxisTicks = buildTimelineAxisTicks;
  xmlViz.buildTagTimeline = buildTagTimeline;
})(typeof window !== "undefined" ? window : globalThis);

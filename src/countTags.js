(function (global) {
  "use strict";

  var xmlViz = global.xmlViz;

  var DEFAULT_NEUTRAL_CSS_COLOR = "rgb(128, 128, 128)";

  function buildCodeColorLookup(codeColors) {
    var lookup = {};
    for (var index = 0; index < codeColors.length; index += 1) {
      var codeColor = codeColors[index];
      lookup[codeColor.code] = codeColor;
    }
    return lookup;
  }

  function countInstancesByCode(taggedInstances) {
    var counts = {};
    for (var index = 0; index < taggedInstances.length; index += 1) {
      var code = taggedInstances[index].code;
      counts[code] = (counts[code] || 0) + 1;
    }
    return counts;
  }

  function orderedCodes(analysisDocument, instanceCounts) {
    var ordered = [];
    var seen = {};
    for (var rowIndex = 0; rowIndex < analysisDocument.codeColors.length; rowIndex += 1) {
      var rowCode = analysisDocument.codeColors[rowIndex].code;
      if (!seen[rowCode] && instanceCounts[rowCode]) {
        ordered.push(rowCode);
        seen[rowCode] = true;
      }
    }
    var remainingCodes = Object.keys(instanceCounts).sort();
    for (var codeIndex = 0; codeIndex < remainingCodes.length; codeIndex += 1) {
      var code = remainingCodes[codeIndex];
      if (!seen[code]) {
        ordered.push(code);
        seen[code] = true;
      }
    }
    return ordered;
  }

  function countLabelGroups(taggedInstances) {
    var tallies = {};
    for (var instanceIndex = 0; instanceIndex < taggedInstances.length; instanceIndex += 1) {
      var labels = taggedInstances[instanceIndex].labels;
      for (var labelIndex = 0; labelIndex < labels.length; labelIndex += 1) {
        var label = labels[labelIndex];
        var key = label.groupName + "\0" + label.text;
        if (!tallies[key]) {
          tallies[key] = {
            groupName: label.groupName,
            text: label.text,
            count: 0,
          };
        }
        tallies[key].count += 1;
      }
    }
    var entries = Object.keys(tallies).map(function (key) {
      return tallies[key];
    });
    entries.sort(function (left, right) {
      if (left.groupName !== right.groupName) {
        return left.groupName.localeCompare(right.groupName);
      }
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.text.localeCompare(right.text);
    });
    return entries;
  }

  function countTags(analysisDocument) {
    var instanceCounts = countInstancesByCode(analysisDocument.taggedInstances);
    var codeOrder = orderedCodes(analysisDocument, instanceCounts);
    var colorLookup = buildCodeColorLookup(analysisDocument.codeColors);
    var tagCounts = codeOrder.map(function (code) {
      var codeColor = colorLookup[code];
      var cssColor = codeColor
        ? xmlViz.codeColorToCssRgb(codeColor)
        : DEFAULT_NEUTRAL_CSS_COLOR;
      return {
        code: code,
        count: instanceCounts[code],
        cssColor: cssColor,
      };
    });
    return {
      tagCounts: tagCounts,
      labelGroupCounts: countLabelGroups(analysisDocument.taggedInstances),
      totalInstanceCount: analysisDocument.taggedInstances.length,
    };
  }

  xmlViz.countTags = countTags;
})(typeof window !== "undefined" ? window : globalThis);

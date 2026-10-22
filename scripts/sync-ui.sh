#!/bin/sh
set -eu
script_directory=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
repository_root=$(CDPATH= cd -- "$script_directory/.." && pwd)
destination="$repository_root/src/vendor/ui.css"
mkdir -p "$(dirname "$destination")"
curl -fsSL "https://raw.githubusercontent.com/camib0b/ui/main/dist/ui.css" -o "$destination"

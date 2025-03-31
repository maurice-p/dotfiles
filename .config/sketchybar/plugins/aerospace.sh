#!/usr/bin/env bash

# make sure it's executable with:
# chmod +x ~/.config/sketchybar/plugins/aerospace.sh

# workspace name is icon eg. [q,w,e,r,..] and label is actual app symbol

if [ "$1" = "$FOCUSED_WORKSPACE" ]; then
  sketchybar --set $NAME background.color=0xFFecdbb2 label.shadow.drawing=on icon.shadow.drawing=on background.border_width=1
  sketchybar --set $NAME icon.color=0xFF3c3836 label.color=0xFF3c3836 
  # icon.shadow.color=0xFFecdbb2 label.shadow.color=0xFFecdbb2


else
  sketchybar --set $NAME background.color=0xFF3c3836 label.shadow.drawing=off icon.shadow.drawing=off background.border_width=0
  sketchybar --set $NAME icon.color=0xFFecdbb2 label.color=0xFFecdbb2  
  # icon.shadow.color=0xFF3c3836 label.shadow.color=0xFF3c3836
fi
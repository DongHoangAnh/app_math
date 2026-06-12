import React from 'react';
import { Image, Text, StyleProp, TextStyle, ImageStyle } from 'react-native';

/**
 * Renders an ASSETS registry value, which may be EITHER an emoji string
 * (e.g. '🔥') OR a require()'d image (a number on native / { uri,… } object on
 * web). The registry is mixed, so consumers should use this instead of
 * `<Text>{ASSETS.x}</Text>` — that crashes when the value is an image object.
 *
 * - string  → <Text> (keeps the original text style: fontSize, color, …)
 * - image   → <Image> sized to `size` × `size`, contain-fit
 */
export default function AssetIcon({
  source,
  size = 24,
  style,
}: {
  source: any;
  size?: number;
  /** Applied to the <Text> branch (emoji). Ignored for the image branch. */
  style?: StyleProp<TextStyle>;
}) {
  if (typeof source === 'string') {
    return <Text style={style}>{source}</Text>;
  }
  const imgStyle: StyleProp<ImageStyle> = { width: size, height: size };
  return <Image source={source} resizeMode="contain" style={imgStyle} />;
}

/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default Target Language - Language to translate screenshots into */
  "defaultLanguage": "en" | "de" | "fr" | "es" | "it" | "pt" | "nl" | "pl" | "ru" | "zh-Hans" | "ja" | "ko"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `translate-clipboard` command */
  export type TranslateClipboard = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `translate-clipboard` command */
  export type TranslateClipboard = {}
}


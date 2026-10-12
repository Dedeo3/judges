import { Config } from "@remotion/cli/config";

// H.264 in an mp4 container is the safest default for judge playback / upload to anything.
Config.setVideoImageFormat("jpeg");
// The demo is mostly small text from screen recordings; the default quality softens it.
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);

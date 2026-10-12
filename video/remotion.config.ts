import { Config } from "@remotion/cli/config";

// H.264 in an mp4 container is the safest default for judge playback / upload to anything.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

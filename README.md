# archive-inspector

This is an extension for VsCode which allows you to mount archive files as workspace folders to browse their contents.

## Features

* Right click an archive file in the explorer view and select `Mount Archive` to mount it in your workspace.

### Supported archive formats
* `.tar`
  * `.tar.gz`
  * `.tar.Z`
  * `.tar.lz`
  * `.tar.lzma`
  * `.tar.lzo`
  * `.tar.zst`
  * `.tar.xz`
  * `.tar.bz2`
  * `.tgz`
  * `.taz`
  * `.taZ`
  * `.tz2`
  * `.tbz2`
  * `.tlz`
  * `.tzst`
* `.zip`

## Requirements

This extension relies on GNU `tar` for archive inspection and extraction.

## Extension Settings

This extension contributes the following settings:

* `archive-inspector.pathToTar`: Path to `tar` binary.
* `archive-inspector.maxStdoutBufferSize`: Maximum size of files that will be able to be previewed in editor.

## Known Issues

* Opening a tarball containing a directory called `.` sends the inspector into an infinite loop.

## Release Notes

### 0.1.0

Initial preview release. Supports the `.tar` format, with or without compression.

### 0.2.0

Add support for `.zip`
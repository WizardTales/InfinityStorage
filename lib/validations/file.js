'use strict';

export const isValidFilePath = async (filePath, file) => {
  // Filepath string can only consist of "/"
  if (filePath === '/') {
    return true;
  }

  // Filepath string should start with "/"
  if (!filePath.startsWith('/') || filePath.startsWith('//')) {
    return false;
  }

  // Filepath string cannot start/end/have with *
  if (
    filePath.includes('*') ||
    filePath.endsWith('*') ||
    filePath.endsWith('/') ||
    filePath.includes('//')
  ) {
    return false;
  }

  // Extract the filename from the filepath
  const filename = filePath.split('/').pop();

  // Filepath string should end with the file name
  if (filename !== file.filename && file.type === 'file') {
    return false;
  }

  // All rules passed, filepath is valid
  return true;
};

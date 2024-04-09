'use strict';

export const isValidFile = async (filePath) => {
  // Filepath string can only consist of "/"
  if (filePath === '/') {
    return true;
  }

  // Filepath string should start with "/"
  if (!filePath.startsWith('/')) {
    console.error('Err: doesnt start with /');
    return false;
  }

  // Filepath string cannot have //, null char or period
  if (['//', '\0', '.'].find((syb) => filePath.includes(syb))) {
    console.error('Err: contains unecessary syb');
    return false;
  }

  // All rules passed, filepath is valid
  return true;
};

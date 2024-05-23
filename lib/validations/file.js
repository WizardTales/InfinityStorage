'use strict';

export const isValidFile = async (filePath) => {
  // Filepath string can only consist of "/"
  if (filePath === '/') {
    return true;
  }

  const ex = new Error();
  ex.code = 400;
  // Filepath string should start with "/"
  if (!filePath.startsWith('/')) {
    ex.message = "File path doesn't start with /";
    throw ex;
  }

  // Filepath string cannot have //, null char or period
  if (['//', '\0', '.'].find((syb) => filePath.includes(syb))) {
    ex.message = 'File path contains unecessary symbols';
    throw ex;
  }

  // All rules passed, filepath is valid
  return true;
};

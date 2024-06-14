const CryptoJS = window.CryptoJS;

async function encrypt (userPart, serverPart, userPass) {
  const step1 = CryptoJS.AES.encrypt(
    userPart,
    CryptoJS.SHA256(serverPart).toString()
  ).toString();
  const step2 = CryptoJS.AES.encrypt(
    step1,
    CryptoJS.SHA256(userPass).toString()
  ).toString();
  const userPartEn = btoa(step2);
  return userPartEn;
}
async function decrypt (userPartEnc, serverPart, userPass) {
  const step1 = atob(userPartEnc);
  const step2 = CryptoJS.AES.decrypt(
    step1,
    CryptoJS.SHA256(userPass).toString()
  ).toString(CryptoJS.enc.Utf8);
  const userPart = CryptoJS.AES.decrypt(
    step2,
    CryptoJS.SHA256(serverPart).toString()
  ).toString(CryptoJS.enc.Utf8);
  return userPart;
}

export default { encrypt, decrypt };

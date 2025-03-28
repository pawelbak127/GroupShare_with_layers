import crypto from 'crypto';

/**
 * Funkcje do generowania par kluczy kryptograficznych
 */

// Generowanie pary kluczy RSA
export async function generateRsaKeyPair(bits = 2048) {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: bits,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        reject(err);
      } else {
        resolve({ publicKey, privateKey });
      }
    });
  });
}

// Generowanie pary kluczy ECC
export async function generateEccKeyPair(namedCurve = 'prime256v1') {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('ec', {
      namedCurve,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        reject(err);
      } else {
        resolve({ publicKey, privateKey });
      }
    });
  });
}
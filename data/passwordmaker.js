/*
PasswordMaker - Creates and manages passwords
Copyright (C) 2005 Eric H. Jung and LeahScape, Inc.
Chrome Version by Richard Musiol
http://passwordmaker.org/
This library is free software; you can redistribute it and/or modify it
under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation; either version 2.1 of the License, or (at
your option) any later version.
This library is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
FITNESSFOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License
for more details.
You should have received a copy of the GNU Lesser General Public License
along with this library; if not, write to the Free Software Foundation,
Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
*/

// From https://github.com/neelance/chrome_password_maker/blob/master/password_maker.js

function makePassword(url, master, username, hashAlgorithm, whereToUseL33t,
    l33tLevel, length, prefix, suffix, selectedChar, counterOffset) {
  // Never *ever, ever* allow the charset's length<2 else
  // the hash algorithms will run indefinitely
  if (selectedChar.length < 2) {
    return "";
  }

  // Calls generatepassword() n times in order to support passwords
  // of arbitrary length regardless of character set length.
  var password = "";
  var count = 0;
  while (password.length < length) {
    // To maintain backwards compatibility with all previous versions of
    // passwordmaker,
    // the first call to _generatepassword() must use the plain "key".
    // Subsequent calls add a number to the end of the key so each iteration
    // doesn't generate the same hash value.
    password += (count == 0) ? generatepassword(hashAlgorithm, master, url
        + username + counterOffset, whereToUseL33t, l33tLevel, length,
        selectedChar, prefix, suffix)
        : generatepassword(hashAlgorithm, master + '\n' + count, url
            + username + counterOffset, whereToUseL33t, l33tLevel,
            length, selectedChar, prefix, suffix);
    count++;
  }

  if (prefix)
    password = prefix + password;
  if (suffix)
    password = password.substring(0, length - suffix.length) + suffix;

  return password.substring(0, length);
}

function generatepassword(hashAlgorithm, key, data, whereToUseL33t, l33tLevel,
    passwordLength, charset, prefix, suffix) {

  // for non-hmac algorithms, the key is master pw and url concatenated
  var usingHMAC = hashAlgorithm.indexOf("hmac") > -1;
  if (!usingHMAC)
    key += data;

  // apply l33t before the algorithm?
  if (whereToUseL33t == "both" || whereToUseL33t == "before-hashing") {
    key = PasswordMaker_l33t.convert(l33tLevel, key);
    if (usingHMAC) {
      data = PasswordMaker_l33t.convert(l33tLevel, data); // new for 0.3;
      // 0.2 didn't
      // apply l33t to
      // _data_ for
      // HMAC
      // algorithms
    }
  }

  // apply the algorithm
  var password = "";
  switch (hashAlgorithm) {
  case "sha256":
    password = PasswordMaker_SHA256.any_sha256(key, charset);
    break;
  case "hmac-sha256":
    password = PasswordMaker_SHA256.any_hmac_sha256(key, data, charset,
        true);
    break;
  case "hmac-sha256_fix":
    password = PasswordMaker_SHA256.any_hmac_sha256(key, data, charset,
        false);
    break;
  case "sha1":
    password = PasswordMaker_SHA1.any_sha1(key, charset);
    break;
  case "hmac-sha1":
    password = PasswordMaker_SHA1.any_hmac_sha1(key, data, charset);
    break;
  case "md4":
    password = PasswordMaker_MD4.any_md4(key, charset);
    break;
  case "hmac-md4":
    password = PasswordMaker_MD4.any_hmac_md4(key, data, charset);
    break;
  case "md5":
    password = PasswordMaker_MD5.any_md5(key, charset);
    break;
  case "md5_v6":
    password = PasswordMaker_MD5_V6.hex_md5(key, charset);
    break;
  case "hmac-md5":
    password = PasswordMaker_MD5.any_hmac_md5(key, data, charset);
    break;
  case "hmac-md5_v6":
    password = PasswordMaker_MD5_V6.hex_hmac_md5(key, data, charset);
    break;
  case "rmd160":
    password = PasswordMaker_RIPEMD160.any_rmd160(key, charset);
    break;
  case "hmac-rmd160":
    password = PasswordMaker_RIPEMD160.any_hmac_rmd160(key, data, charset);
    break;
  }
  // apply l33t after the algorithm?
  if (whereToUseL33t == "both" || whereToUseL33t == "after-hashing")
    return PasswordMaker_l33t.convert(l33tLevel, password);
  return password;
}

// scripts/aes.js

/*
 * rijndael.js Rijndael Reference Implementation Copyright (c) 2001 Fritz
 * Schneider See http://www-cse.ucsd.edu/~fritz/rijndael.html
 */
// Rijndael parameters -- Valid values are 128, 192, or 256
var keySizeInBits = 256;
var blockSizeInBits = 128;

// ///// You shouldn't have to modify anything below this line except for
// ///// the function getRandomBytes().
//
// Note: in the following code the two dimensional arrays are indexed as
// you would probably expect, as array[row][column]. The state arrays
// are 2d arrays of the form state[4][Nb].

// The number of rounds for the cipher, indexed by [Nk][Nb]
var roundsArray = [ , , , , [ , , , , 10, , 12, , 14 ], ,
    [ , , , , 12, , 12, , 14 ], , [ , , , , 14, , 14, , 14 ] ];

// The number of bytes to shift by in shiftRow, indexed by [Nb][row]
var shiftOffsets = [ , , , , [ , 1, 2, 3 ], , [ , 1, 2, 3 ], , [ , 1, 3, 4 ] ];

// The round constants used in subkey expansion
var Rcon = [ 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c,
    0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a,
    0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91 ];

// Precomputed lookup table for the SBox
var SBox = [ 99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215,
    171, 118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175,
    156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229,
    241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128,
    226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214,
    179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203,
    190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249,
    2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188,
    182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23,
    196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144,
    136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36,
    92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213,
    78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28,
    166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102,
    72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17,
    105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137,
    13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22 ];

// Precomputed lookup table for the inverse SBox
var SBoxInverse = [ 82, 9, 106, 213, 48, 54, 165, 56, 191, 64, 163, 158, 129,
    243, 215, 251, 124, 227, 57, 130, 155, 47, 255, 135, 52, 142, 67, 68,
    196, 222, 233, 203, 84, 123, 148, 50, 166, 194, 35, 61, 238, 76, 149,
    11, 66, 250, 195, 78, 8, 46, 161, 102, 40, 217, 36, 178, 118, 91, 162,
    73, 109, 139, 209, 37, 114, 248, 246, 100, 134, 104, 152, 22, 212, 164,
    92, 204, 93, 101, 182, 146, 108, 112, 72, 80, 253, 237, 185, 218, 94,
    21, 70, 87, 167, 141, 157, 132, 144, 216, 171, 0, 140, 188, 211, 10,
    247, 228, 88, 5, 184, 179, 69, 6, 208, 44, 30, 143, 202, 63, 15, 2,
    193, 175, 189, 3, 1, 19, 138, 107, 58, 145, 17, 65, 79, 103, 220, 234,
    151, 242, 207, 206, 240, 180, 230, 115, 150, 172, 116, 34, 231, 173,
    53, 133, 226, 249, 55, 232, 28, 117, 223, 110, 71, 241, 26, 113, 29,
    41, 197, 137, 111, 183, 98, 14, 170, 24, 190, 27, 252, 86, 62, 75, 198,
    210, 121, 32, 154, 219, 192, 254, 120, 205, 90, 244, 31, 221, 168, 51,
    136, 7, 199, 49, 177, 18, 16, 89, 39, 128, 236, 95, 96, 81, 127, 169,
    25, 181, 74, 13, 45, 229, 122, 159, 147, 201, 156, 239, 160, 224, 59,
    77, 174, 42, 245, 176, 200, 235, 187, 60, 131, 83, 153, 97, 23, 43, 4,
    126, 186, 119, 214, 38, 225, 105, 20, 99, 85, 33, 12, 125 ];

// This method circularly shifts the array left by the number of elements
// given in its parameter. It returns the resulting array and is used for
// the ShiftRow step. Note that shift() and push() could be used for a more
// elegant solution, but they require IE5.5+, so I chose to do it manually.

function cyclicShiftLeft(theArray, positions) {
  var temp = theArray.slice(0, positions);
  theArray = theArray.slice(positions).concat(temp);
  return theArray;
}

// Cipher parameters ... do not change these
var Nk = keySizeInBits / 32;
var Nb = blockSizeInBits / 32;
var Nr = roundsArray[Nk][Nb];

// Multiplies the element "poly" of GF(2^8) by x. See the Rijndael spec.

function xtime(poly) {
  poly <<= 1;
  return ((poly & 0x100) ? (poly ^ 0x11B) : (poly));
}

// Multiplies the two elements of GF(2^8) together and returns the result.
// See the Rijndael spec, but should be straightforward: for each power of
// the indeterminant that has a 1 coefficient in x, add y times that power
// to the result. x and y should be bytes representing elements of GF(2^8)

function mult_GF256(x, y) {
  var bit, result = 0;

  for (bit = 1; bit < 256; bit *= 2, y = xtime(y)) {
    if (x & bit)
      result ^= y;
  }
  return result;
}

// Performs the substitution step of the cipher. State is the 2d array of
// state information (see spec) and direction is string indicating whether
// we are performing the forward substitution ("encrypt") or inverse
// substitution (anything else)

function byteSub(state, direction) {
  var S;
  if (direction == "encrypt") // Point S to the SBox we're using
    S = SBox;
  else
    S = SBoxInverse;
  for ( var i = 0; i < 4; i++)
    // Substitute for every byte in state
    for ( var j = 0; j < Nb; j++)
      state[i][j] = S[state[i][j]];
}

// Performs the row shifting step of the cipher.

function shiftRow(state, direction) {
  for ( var i = 1; i < 4; i++)
    // Row 0 never shifts
    if (direction == "encrypt")
      state[i] = cyclicShiftLeft(state[i], shiftOffsets[Nb][i]);
    else
      state[i] = cyclicShiftLeft(state[i], Nb - shiftOffsets[Nb][i]);

}

// Performs the column mixing step of the cipher. Most of these steps can
// be combined into table lookups on 32bit values (at least for encryption)
// to greatly increase the speed.

function mixColumn(state, direction) {
  var b = []; // Result of matrix multiplications
  for ( var j = 0; j < Nb; j++) { // Go through each column...
    for ( var i = 0; i < 4; i++) { // and for each row in the column...
      if (direction == "encrypt")
        b[i] = mult_GF256(state[i][j], 2)
            ^ // perform mixing
            mult_GF256(state[(i + 1) % 4][j], 3)
            ^ state[(i + 2) % 4][j] ^ state[(i + 3) % 4][j];
      else
        b[i] = mult_GF256(state[i][j], 0xE)
            ^ mult_GF256(state[(i + 1) % 4][j], 0xB)
            ^ mult_GF256(state[(i + 2) % 4][j], 0xD)
            ^ mult_GF256(state[(i + 3) % 4][j], 9);
    }
    for ( var i = 0; i < 4; i++)
      // Place result back into column
      state[i][j] = b[i];
  }
}

// Adds the current round key to the state information. Straightforward.

function addRoundKey(state, roundKey) {
  for ( var j = 0; j < Nb; j++) { // Step through columns...
    state[0][j] ^= (roundKey[j] & 0xFF); // and XOR
    state[1][j] ^= ((roundKey[j] >> 8) & 0xFF);
    state[2][j] ^= ((roundKey[j] >> 16) & 0xFF);
    state[3][j] ^= ((roundKey[j] >> 24) & 0xFF);
  }
}

// This function creates the expanded key from the input (128/192/256-bit)
// key. The parameter key is an array of bytes holding the value of the key.
// The returned value is an array whose elements are the 32-bit words that
// make up the expanded key.

function keyExpansion(key) {
  var expandedKey = new Array();
  var temp;

  // in case the key size or parameters were changed...
  Nk = keySizeInBits / 32;
  Nb = blockSizeInBits / 32;
  Nr = roundsArray[Nk][Nb];

  for ( var j = 0; j < Nk; j++)
    // Fill in input key first
    expandedKey[j] = (key[4 * j]) | (key[4 * j + 1] << 8)
        | (key[4 * j + 2] << 16) | (key[4 * j + 3] << 24);

  // Now walk down the rest of the array filling in expanded key bytes as
  // per Rijndael's spec
  for (j = Nk; j < Nb * (Nr + 1); j++) { // For each word of expanded key
    temp = expandedKey[j - 1];
    if (j % Nk == 0)
      temp = ((SBox[(temp >> 8) & 0xFF])
          | (SBox[(temp >> 16) & 0xFF] << 8)
          | (SBox[(temp >> 24) & 0xFF] << 16) | (SBox[temp & 0xFF] << 24))
          ^ Rcon[Math.floor(j / Nk) - 1];
    else if (Nk > 6 && j % Nk == 4)
      temp = (SBox[(temp >> 24) & 0xFF] << 24)
          | (SBox[(temp >> 16) & 0xFF] << 16)
          | (SBox[(temp >> 8) & 0xFF] << 8) | (SBox[temp & 0xFF]);
    expandedKey[j] = expandedKey[j - Nk] ^ temp;
  }
  return expandedKey;
}

// Rijndael's round functions...

function Round(state, roundKey) {
  byteSub(state, "encrypt");
  shiftRow(state, "encrypt");
  mixColumn(state, "encrypt");
  addRoundKey(state, roundKey);
}

function InverseRound(state, roundKey) {
  addRoundKey(state, roundKey);
  mixColumn(state, "decrypt");
  shiftRow(state, "decrypt");
  byteSub(state, "decrypt");
}

function FinalRound(state, roundKey) {
  byteSub(state, "encrypt");
  shiftRow(state, "encrypt");
  addRoundKey(state, roundKey);
}

function InverseFinalRound(state, roundKey) {
  addRoundKey(state, roundKey);
  shiftRow(state, "decrypt");
  byteSub(state, "decrypt");
}

// encrypt is the basic encryption function. It takes parameters
// block, an array of bytes representing a plaintext block, and expandedKey,
// an array of words representing the expanded key previously returned by
// keyExpansion(). The ciphertext block is returned as an array of bytes.

function encrypt(block, expandedKey) {
  var i;
  if (!block || block.length * 8 != blockSizeInBits)
    return;
  if (!expandedKey)
    return;

  block = packBytes(block);
  addRoundKey(block, expandedKey);
  for (i = 1; i < Nr; i++)
    Round(block, expandedKey.slice(Nb * i, Nb * (i + 1)));
  FinalRound(block, expandedKey.slice(Nb * Nr));
  return unpackBytes(block);
}

// decrypt is the basic decryption function. It takes parameters
// block, an array of bytes representing a ciphertext block, and expandedKey,
// an array of words representing the expanded key previously returned by
// keyExpansion(). The decrypted block is returned as an array of bytes.

function decrypt(block, expandedKey) {
  var i;
  if (!block || block.length * 8 != blockSizeInBits)
    return;
  if (!expandedKey)
    return;

  block = packBytes(block);
  InverseFinalRound(block, expandedKey.slice(Nb * Nr));
  for (i = Nr - 1; i > 0; i--)
    InverseRound(block, expandedKey.slice(Nb * i, Nb * (i + 1)));
  addRoundKey(block, expandedKey);
  return unpackBytes(block);
}

// This method takes a byte array (byteArray) and converts it to a string by
// applying String.fromCharCode() to each value and concatenating the result.
// The resulting string is returned. Note that this function SKIPS zero bytes
// under the assumption that they are padding added in formatPlaintext().
// Obviously, do not invoke this method on raw data that can contain zero
// bytes. It is really only appropriate for printable ASCII/Latin-1
// values. Roll your own function for more robust functionality :)

function byteArrayToString(byteArray) {
  var result = "";
  for ( var i = 0; i < byteArray.length; i++)
    if (byteArray[i] != 0)
      result += String.fromCharCode(byteArray[i]);
  return result;
}

// This function takes an array of bytes (byteArray) and converts them
// to a hexadecimal string. Array element 0 is found at the beginning of
// the resulting string, high nibble first. Consecutive elements follow
// similarly, for example [16, 255] --> "10ff". The function returns a
// string.

function byteArrayToHex(byteArray) {
  var result = "";
  if (!byteArray)
    return;
  for ( var i = 0; i < byteArray.length; i++)
    result += ((byteArray[i] < 16) ? "0" : "") + byteArray[i].toString(16);

  return result;
}

// This function converts a string containing hexadecimal digits to an
// array of bytes. The resulting byte array is filled in the order the
// values occur in the string, for example "10FF" --> [16, 255]. This
// function returns an array.

function hexToByteArray(hexString) {
  var byteArray = [];
  if (hexString.length % 2) // must have even length
    return;
  if (hexString.indexOf("0x") == 0 || hexString.indexOf("0X") == 0)
    hexString = hexString.substring(2);
  for ( var i = 0; i < hexString.length; i += 2)
    byteArray[Math.floor(i / 2)] = parseInt(hexString.slice(i, i + 2), 16);
  return byteArray;
}

// This function packs an array of bytes into the four row form defined by
// Rijndael. It assumes the length of the array of bytes is divisible by
// four. Bytes are filled in according to the Rijndael spec (starting with
// column 0, row 0 to 3). This function returns a 2d array.

function packBytes(octets) {
  var state = new Array();
  if (!octets || octets.length % 4)
    return;

  state[0] = new Array();
  state[1] = new Array();
  state[2] = new Array();
  state[3] = new Array();
  for ( var j = 0; j < octets.length; j += 4) {
    state[0][j / 4] = octets[j];
    state[1][j / 4] = octets[j + 1];
    state[2][j / 4] = octets[j + 2];
    state[3][j / 4] = octets[j + 3];
  }
  return state;
}

// This function unpacks an array of bytes from the four row format preferred
// by Rijndael into a single 1d array of bytes. It assumes the input "packed"
// is a packed array. Bytes are filled in according to the Rijndael spec.
// This function returns a 1d array of bytes.

function unpackBytes(packed) {
  var result = new Array();
  for ( var j = 0; j < packed[0].length; j++) {
    result[result.length] = packed[0][j];
    result[result.length] = packed[1][j];
    result[result.length] = packed[2][j];
    result[result.length] = packed[3][j];
  }
  return result;
}

// This function takes a prospective plaintext (string or array of bytes)
// and pads it with zero bytes if its length is not a multiple of the block
// size. If plaintext is a string, it is converted to an array of bytes
// in the process. The type checking can be made much nicer using the
// instanceof operator, but this operator is not available until IE5.0 so I
// chose to use the heuristic below.

function formatPlaintext(plaintext) {
  var bpb = blockSizeInBits / 8; // bytes per block
  var i;

  // if primitive string or String instance
  if (typeof plaintext == "string" || plaintext.indexOf) {
    plaintext = plaintext.split("");
    // Unicode issues here (ignoring high byte)
    for (i = 0; i < plaintext.length; i++)
      plaintext[i] = plaintext[i].charCodeAt(0) & 0xFF;
  }

  for (i = bpb - (plaintext.length % bpb); i > 0 && i < bpb; i--)
    plaintext[plaintext.length] = 0;

  return plaintext;
}

// Returns an array containing "howMany" random bytes. YOU SHOULD CHANGE THIS
// TO RETURN HIGHER QUALITY RANDOM BYTES IF YOU ARE USING THIS FOR A "REAL"
// APPLICATION.

function getRandomBytes(howMany) {
  var i;
  var bytes = new Array();
  for (i = 0; i < howMany; i++)
    bytes[i] = Math.round(Math.random() * 255);
  return bytes;
}

// rijndaelEncrypt(plaintext, key, mode)
// Encrypts the plaintext using the given key and in the given mode.
// The parameter "plaintext" can either be a string or an array of bytes.
// The parameter "key" must be an array of key bytes. If you have a hex
// string representing the key, invoke hexToByteArray() on it to convert it
// to an array of bytes. The third parameter "mode" is a string indicating
// the encryption mode to use, either "ECB" or "CBC". If the parameter is
// omitted, ECB is assumed.
// 
// An array of bytes representing the cihpertext is returned. To convert
// this array to hex, invoke byteArrayToHex() on it. If you are using this
// "for real" it is a good idea to change the function getRandomBytes() to
// something that returns truly random bits.

function rijndaelEncrypt(plaintext, key, mode) {
  var expandedKey, i, aBlock;
  var bpb = blockSizeInBits / 8; // bytes per block
  var ct; // ciphertext
  if (!plaintext || !key)
    return;
  if (key.length * 8 != keySizeInBits)
    return;
  if (mode == "CBC")
    ct = getRandomBytes(bpb); // get IV
  else {
    mode = "ECB";
    ct = new Array();
  }

  // convert plaintext to byte array and pad with zeros if necessary.
  plaintext = formatPlaintext(plaintext);

  expandedKey = keyExpansion(key);

  for ( var block = 0; block < plaintext.length / bpb; block++) {
    aBlock = plaintext.slice(block * bpb, (block + 1) * bpb);
    if (mode == "CBC")
      for ( var i = 0; i < bpb; i++)
        aBlock[i] ^= ct[block * bpb + i];

    ct = ct.concat(encrypt(aBlock, expandedKey));
  }

  return ct;
}

// rijndaelDecrypt(ciphertext, key, mode)
// Decrypts the using the given key and mode. The parameter "ciphertext"
// must be an array of bytes. The parameter "key" must be an array of key
// bytes. If you have a hex string representing the ciphertext or key,
// invoke hexToByteArray() on it to convert it to an array of bytes. The
// parameter "mode" is a string, either "CBC" or "ECB".
// 
// An array of bytes representing the plaintext is returned. To convert
// this array to a hex string, invoke byteArrayToHex() on it. To convert it
// to a string of characters, you can use byteArrayToString().

function rijndaelDecrypt(ciphertext, key, mode) {
  var expandedKey;
  var bpb = blockSizeInBits / 8; // bytes per block
  var pt = new Array(); // plaintext array
  var aBlock; // a decrypted block
  var block; // current block number
  if (!ciphertext || !key || typeof ciphertext == "string")
    return;
  if (key.length * 8 != keySizeInBits)
    return;
  if (!mode)
    mode = "ECB"; // assume ECB if mode omitted
  expandedKey = keyExpansion(key);

  // work backwards to accomodate CBC mode
  for (block = (ciphertext.length / bpb) - 1; block > 0; block--) {
    aBlock = decrypt(ciphertext.slice(block * bpb, (block + 1) * bpb),
        expandedKey);
    if (mode == "CBC")
      for ( var i = 0; i < bpb; i++)
        pt[(block - 1) * bpb + i] = aBlock[i]
            ^ ciphertext[(block - 1) * bpb + i];
    else
      pt = aBlock.concat(pt);
  }

  // do last block if ECB (skips the IV in CBC)
  if (mode == "ECB")
    pt = decrypt(ciphertext.slice(0, bpb), expandedKey).concat(pt);

  return pt;
}

//scripts/md4.js

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD4 Message Digest
 * Algorithm, as defined in RFC 1320. Version 2.1 Copyright (C) Jerrad Pierce,
 * Paul Johnston 1999 - 2002. Other contributors: Greg Holt, Andrew Kepert,
 * Ydnar, Lostinet Distributed under the BSD License See
 * http://pajhome.org.uk/crypt/md5 for more info.
 * 
 * Modified by Eric H. Jung (grimholtz@yahoo.com)
 */
if (typeof (PasswordMaker_MD4) != "object") {
  var PasswordMaker_MD4 = {

    any_md4 : function(s, e) {
      return PasswordMaker_HashUtils.rstr2any(this
          .rstr_md4(PasswordMaker_HashUtils.str2rstr_utf8(s)), e);
    },
    any_hmac_md4 : function(k, d, e) {
      return PasswordMaker_HashUtils.rstr2any(this.rstr_hmac_md4(
          PasswordMaker_HashUtils.str2rstr_utf8(k),
          PasswordMaker_HashUtils.str2rstr_utf8(d)), e);
    },

    /*
     * Calculate the MD4 of a raw string
     */
    rstr_md4 : function(s) {
      return PasswordMaker_HashUtils.binl2rstr(this.binl_md4(
          PasswordMaker_HashUtils.rstr2binl(s), s.length
              * PasswordMaker_HashUtils.chrsz));
    },

    /*
     * Calculate the MD4 of an array of little-endian words, and a bit
     * length
     */
    binl_md4 : function(x, len) {
      /* append padding */
      x[len >> 5] |= 0x80 << (len % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;

      var a = 1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d = 271733878;

      for ( var i = 0; i < x.length; i += 16) {
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;

        a = this.md4_ff(a, b, c, d, x[i + 0], 3);
        d = this.md4_ff(d, a, b, c, x[i + 1], 7);
        c = this.md4_ff(c, d, a, b, x[i + 2], 11);
        b = this.md4_ff(b, c, d, a, x[i + 3], 19);
        a = this.md4_ff(a, b, c, d, x[i + 4], 3);
        d = this.md4_ff(d, a, b, c, x[i + 5], 7);
        c = this.md4_ff(c, d, a, b, x[i + 6], 11);
        b = this.md4_ff(b, c, d, a, x[i + 7], 19);
        a = this.md4_ff(a, b, c, d, x[i + 8], 3);
        d = this.md4_ff(d, a, b, c, x[i + 9], 7);
        c = this.md4_ff(c, d, a, b, x[i + 10], 11);
        b = this.md4_ff(b, c, d, a, x[i + 11], 19);
        a = this.md4_ff(a, b, c, d, x[i + 12], 3);
        d = this.md4_ff(d, a, b, c, x[i + 13], 7);
        c = this.md4_ff(c, d, a, b, x[i + 14], 11);
        b = this.md4_ff(b, c, d, a, x[i + 15], 19);

        a = this.md4_gg(a, b, c, d, x[i + 0], 3);
        d = this.md4_gg(d, a, b, c, x[i + 4], 5);
        c = this.md4_gg(c, d, a, b, x[i + 8], 9);
        b = this.md4_gg(b, c, d, a, x[i + 12], 13);
        a = this.md4_gg(a, b, c, d, x[i + 1], 3);
        d = this.md4_gg(d, a, b, c, x[i + 5], 5);
        c = this.md4_gg(c, d, a, b, x[i + 9], 9);
        b = this.md4_gg(b, c, d, a, x[i + 13], 13);
        a = this.md4_gg(a, b, c, d, x[i + 2], 3);
        d = this.md4_gg(d, a, b, c, x[i + 6], 5);
        c = this.md4_gg(c, d, a, b, x[i + 10], 9);
        b = this.md4_gg(b, c, d, a, x[i + 14], 13);
        a = this.md4_gg(a, b, c, d, x[i + 3], 3);
        d = this.md4_gg(d, a, b, c, x[i + 7], 5);
        c = this.md4_gg(c, d, a, b, x[i + 11], 9);
        b = this.md4_gg(b, c, d, a, x[i + 15], 13);

        a = this.md4_hh(a, b, c, d, x[i + 0], 3);
        d = this.md4_hh(d, a, b, c, x[i + 8], 9);
        c = this.md4_hh(c, d, a, b, x[i + 4], 11);
        b = this.md4_hh(b, c, d, a, x[i + 12], 15);
        a = this.md4_hh(a, b, c, d, x[i + 2], 3);
        d = this.md4_hh(d, a, b, c, x[i + 10], 9);
        c = this.md4_hh(c, d, a, b, x[i + 6], 11);
        b = this.md4_hh(b, c, d, a, x[i + 14], 15);
        a = this.md4_hh(a, b, c, d, x[i + 1], 3);
        d = this.md4_hh(d, a, b, c, x[i + 9], 9);
        c = this.md4_hh(c, d, a, b, x[i + 5], 11);
        b = this.md4_hh(b, c, d, a, x[i + 13], 15);
        a = this.md4_hh(a, b, c, d, x[i + 3], 3);
        d = this.md4_hh(d, a, b, c, x[i + 11], 9);
        c = this.md4_hh(c, d, a, b, x[i + 7], 11);
        b = this.md4_hh(b, c, d, a, x[i + 15], 15);

        a = PasswordMaker_HashUtils.safe_add(a, olda);
        b = PasswordMaker_HashUtils.safe_add(b, oldb);
        c = PasswordMaker_HashUtils.safe_add(c, oldc);
        d = PasswordMaker_HashUtils.safe_add(d, oldd);

      }
      return Array(a, b, c, d);
    },

    /*
     * These functions implement the basic operation for each round of the
     * algorithm.
     */
    md4_cmn : function(q, a, b, x, s, t) {
      return PasswordMaker_HashUtils.safe_add(PasswordMaker_HashUtils
          .bit_rol(PasswordMaker_HashUtils.safe_add(
              PasswordMaker_HashUtils.safe_add(a, q),
              PasswordMaker_HashUtils.safe_add(x, t)), s), b);
    },
    md4_ff : function(a, b, c, d, x, s) {
      return this.md4_cmn((b & c) | ((~b) & d), a, 0, x, s, 0);
    },
    md4_gg : function(a, b, c, d, x, s) {
      return this.md4_cmn((b & c) | (b & d) | (c & d), a, 0, x, s,
          1518500249);
    },
    md4_hh : function(a, b, c, d, x, s) {
      return this.md4_cmn(b ^ c ^ d, a, 0, x, s, 1859775393);
    },

    /*
     * Calculate the HMAC-MD4 of a key and some data
     */
    rstr_hmac_md4 : function(key, data) {
      var bkey = PasswordMaker_HashUtils.rstr2binl(key);
      if (bkey.length > 16)
        bkey = this.binl_md4(bkey, key.length
            * PasswordMaker_HashUtils.chrsz);

      var ipad = Array(16), opad = Array(16);
      for ( var i = 0; i < 16; i++) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
      }

      var hash = this.binl_md4(ipad.concat(PasswordMaker_HashUtils
          .rstr2binl(data)), 512 + data.length
          * PasswordMaker_HashUtils.chrsz);
      // return this.binl_md4(opad.concat(hash), 512 + 128);
      return PasswordMaker_HashUtils.binl2rstr(this.binl_md4(opad
          .concat(hash), 512 + 128));
    }
  }
}

// scripts/md5.js

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message Digest
 * Algorithm, as defined in RFC 1321. Version 2.2-alpha Copyright (C) Paul
 * Johnston 1999 - 2005 Other contributors: Greg Holt, Andrew Kepert, Ydnar,
 * Lostinet Distributed under the BSD License See
 * http://pajhome.org.uk/crypt/md5 for more info.
 * 
 * Modified by Eric H. Jung (grimholtz@yahoo.com)
 */
if (typeof (PasswordMaker_MD5) != "object") {
  var PasswordMaker_MD5 = {

    any_md5 : function(s, e) {
      return PasswordMaker_HashUtils.rstr2any(this
          .rstr_md5(PasswordMaker_HashUtils.str2rstr_utf8(s)), e);
    },
    any_hmac_md5 : function(k, d, e) {
      return PasswordMaker_HashUtils.rstr2any(this.rstr_hmac_md5(
          PasswordMaker_HashUtils.str2rstr_utf8(k),
          PasswordMaker_HashUtils.str2rstr_utf8(d)), e);
    },

    /*
     * Calculate the MD5 of a raw string
     */
    rstr_md5 : function(s) {
      return PasswordMaker_HashUtils.binl2rstr(this.binl_md5(
          PasswordMaker_HashUtils.rstr2binl(s), s.length
              * PasswordMaker_HashUtils.chrsz));
    },

    /*
     * Calculate the MD5 of an array of little-endian words, and a bit
     * length.
     */
    binl_md5 : function(x, len) {
      /* append padding */
      x[len >> 5] |= 0x80 << ((len) % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;

      var a = 1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d = 271733878;

      for ( var i = 0; i < x.length; i += 16) {
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;

        a = this.md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
        d = this.md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = this.md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = this.md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = this.md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = this.md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = this.md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = this.md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = this.md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = this.md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = this.md5_ff(c, d, a, b, x[i + 10], 17, -42063);
        b = this.md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = this.md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = this.md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = this.md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = this.md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

        a = this.md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = this.md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = this.md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = this.md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
        a = this.md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = this.md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = this.md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = this.md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = this.md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = this.md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = this.md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = this.md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = this.md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = this.md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = this.md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = this.md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

        a = this.md5_hh(a, b, c, d, x[i + 5], 4, -378558);
        d = this.md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = this.md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = this.md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = this.md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = this.md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = this.md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = this.md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = this.md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = this.md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
        c = this.md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = this.md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = this.md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = this.md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = this.md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = this.md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

        a = this.md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
        d = this.md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = this.md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = this.md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = this.md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = this.md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = this.md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = this.md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = this.md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = this.md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = this.md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = this.md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = this.md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = this.md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = this.md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = this.md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

        a = PasswordMaker_HashUtils.safe_add(a, olda);
        b = PasswordMaker_HashUtils.safe_add(b, oldb);
        c = PasswordMaker_HashUtils.safe_add(c, oldc);
        d = PasswordMaker_HashUtils.safe_add(d, oldd);
      }
      return Array(a, b, c, d);
    },

    /*
     * These functions implement the four basic operations the algorithm
     * uses.
     */
    md5_cmn : function(q, a, b, x, s, t) {
      return PasswordMaker_HashUtils.safe_add(PasswordMaker_HashUtils
          .bit_rol(PasswordMaker_HashUtils.safe_add(
              PasswordMaker_HashUtils.safe_add(a, q),
              PasswordMaker_HashUtils.safe_add(x, t)), s), b);
    },
    md5_ff : function(a, b, c, d, x, s, t) {
      return this.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    },
    md5_gg : function(a, b, c, d, x, s, t) {
      return this.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    },
    md5_hh : function(a, b, c, d, x, s, t) {
      return this.md5_cmn(b ^ c ^ d, a, b, x, s, t);
    },
    md5_ii : function(a, b, c, d, x, s, t) {
      return this.md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    },

    /*
     * Calculate the HMAC-MD5 of a key and some data (raw strings)
     */
    rstr_hmac_md5 : function(key, data) {
      var bkey = PasswordMaker_HashUtils.rstr2binl(key);
      if (bkey.length > 16)
        bkey = this.binl_md5(bkey, key.length
            * PasswordMaker_HashUtils.chrsz);

      var ipad = Array(16), opad = Array(16);
      for ( var i = 0; i < 16; i++) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
      }

      var hash = this.binl_md5(ipad.concat(PasswordMaker_HashUtils
          .rstr2binl(data)), 512 + data.length
          * PasswordMaker_HashUtils.chrsz);
      return PasswordMaker_HashUtils.binl2rstr(this.binl_md5(opad
          .concat(hash), 512 + 128));
    }
  }
}

// scripts/md5_v6.js

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message Digest
 * Algorithm, as defined in RFC 1321. Version 2.1 Copyright (C) Paul Johnston
 * 1999 - 2002. Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License See http://pajhome.org.uk/crypt/md5 for
 * more info.
 * 
 * Modified by Eric H. Jung (grimholtz@yahoo.com) Note: Differs from md5.js
 * because it retains leading 0's (for version 0.6 compliance)
 */
if (typeof (PasswordMaker_MD5_V6) != "boolean") {
  var PasswordMaker_MD5_V6 = true;
  var PasswordMaker_MD5_V6 = {

    /*
     * Configurable variables. You may need to tweak these to be compatible
     * with the server-side, but the defaults work in most cases.
     */
    hexcase : 0, /* hex output format. 0 - lowercase; 1 - uppercase */
    b64pad : "", /* base-64 pad character. "=" for strict RFC compliance */
    chrsz : 8, /* bits per input character. 8 - ASCII; 16 - Unicode */
    /*
     * These are the functions you'll usually want to call They take string
     * arguments and return either hex or base-64 encoded strings
     */
    hex_md5 : function(key) {
      return this.binl2hex(this.core_md5(this.str2binl(key), key.length
          * this.chrsz));
    },
    hex_hmac_md5 : function(key, data) {
      return this.binl2hex(this.core_hmac_md5(key, data));
    },

    /*
     * Calculate the MD5 of an array of little-endian words, and a bit
     * length
     */
    core_md5 : function(x, len) {
      /* append padding */
      x[len >> 5] |= 0x80 << ((len) % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;

      var a = 1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d = 271733878;

      for ( var i = 0; i < x.length; i += 16) {
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;

        a = this.md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
        d = this.md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = this.md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = this.md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = this.md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = this.md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = this.md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = this.md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = this.md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = this.md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = this.md5_ff(c, d, a, b, x[i + 10], 17, -42063);
        b = this.md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = this.md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = this.md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = this.md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = this.md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

        a = this.md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = this.md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = this.md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = this.md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
        a = this.md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = this.md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = this.md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = this.md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = this.md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = this.md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = this.md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = this.md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = this.md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = this.md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = this.md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = this.md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

        a = this.md5_hh(a, b, c, d, x[i + 5], 4, -378558);
        d = this.md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = this.md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = this.md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = this.md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = this.md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = this.md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = this.md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = this.md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = this.md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
        c = this.md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = this.md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = this.md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = this.md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = this.md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = this.md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

        a = this.md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
        d = this.md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = this.md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = this.md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = this.md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = this.md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = this.md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = this.md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = this.md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = this.md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = this.md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = this.md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = this.md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = this.md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = this.md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = this.md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

        a = PasswordMaker_HashUtils.safe_add(a, olda);
        b = PasswordMaker_HashUtils.safe_add(b, oldb);
        c = PasswordMaker_HashUtils.safe_add(c, oldc);
        d = PasswordMaker_HashUtils.safe_add(d, oldd);
      }
      return Array(a, b, c, d);

    },

    /*
     * These functions implement the four basic operations the algorithm
     * uses.
     */
    md5_cmn : function(q, a, b, x, s, t) {
      return PasswordMaker_HashUtils.safe_add(PasswordMaker_HashUtils
          .bit_rol(PasswordMaker_HashUtils.safe_add(
              PasswordMaker_HashUtils.safe_add(a, q),
              PasswordMaker_HashUtils.safe_add(x, t)), s), b);
    },
    md5_ff : function(a, b, c, d, x, s, t) {
      return this.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    },
    md5_gg : function(a, b, c, d, x, s, t) {
      return this.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    },
    md5_hh : function(a, b, c, d, x, s, t) {
      return this.md5_cmn(b ^ c ^ d, a, b, x, s, t);
    },
    md5_ii : function(a, b, c, d, x, s, t) {
      return this.md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    },

    /*
     * Calculate the HMAC-MD5, of a key and some data
     */
    core_hmac_md5 : function(key, data) {
      var bkey = this.str2binl(key);
      if (bkey.length > 16)
        bkey = this.core_md5(bkey, key.length * this.chrsz);

      var ipad = Array(16), opad = Array(16);
      for ( var i = 0; i < 16; i++) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
      }

      var hash = this.core_md5(ipad.concat(this.str2binl(data)), 512
          + data.length * this.chrsz);
      return this.core_md5(opad.concat(hash), 512 + 128);
    },

    /*
     * Convert a string to an array of little-endian words If chrsz is
     * ASCII, characters >255 have their hi-byte silently ignored.
     */
    str2binl : function(str) {
      var bin = Array();
      var mask = (1 << this.chrsz) - 1;
      for ( var i = 0; i < str.length * this.chrsz; i += this.chrsz)
        bin[i >> 5] |= (str.charCodeAt(i / this.chrsz) & mask) << (i % 32);
      return bin;
    },

    /*
     * Convert an array of little-endian words to a hex string.
     */
    binl2hex : function(binarray) {
      var hex_tab = this.hexcase ? "0123456789ABCDEF"
          : "0123456789abcdef";
      var str = "";
      for ( var i = 0; i < binarray.length * 4; i++) {
        str += hex_tab
            .charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF)
            + hex_tab
                .charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xF);
      }
      return str;
    }
  }
}

// scripts/sha256.js

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS PUB XXXXXX Version 2.2-alpha Copyright Angel Marin, Paul Johnston
 * 2000 - 2005. Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License See http://pajhome.org.uk/crypt/md5 for
 * details.
 * 
 * modified by Eric H. Jung (grimholtz@yahoo.com) - 2005
 * 
 */
if (typeof (PasswordMaker_SHA256) != "object") {
  var PasswordMaker_SHA256 = {
    any_sha256 : function(s, e) {
      return PasswordMaker_HashUtils.rstr2any(this
          .rstr_sha256(PasswordMaker_HashUtils.str2rstr_utf8(s)), e);
    },
    any_hmac_sha256 : function(k, d, e, b) {
      return PasswordMaker_HashUtils.rstr2any(this.rstr_hmac_sha256(
          PasswordMaker_HashUtils.str2rstr_utf8(k),
          PasswordMaker_HashUtils.str2rstr_utf8(d), b), e);
    },

    /*
     * Calculate the sha256 of a raw string
     */
    rstr_sha256 : function(s) {
      return PasswordMaker_HashUtils.binb2rstr(this.binb_sha256(
          PasswordMaker_HashUtils.rstr2binb(s), s.length * 8));
    },

    /*
     * Calculate the HMAC-sha256 of a key and some data (raw strings)
     */
    rstr_hmac_sha256 : function(key, data, bug) {
      var bkey = PasswordMaker_HashUtils.rstr2binb(key);
      if (bkey.length > 16)
        bkey = this.binb_sha256(bkey, key.length * 8);

      var ipad = Array(16), opad = Array(16);
      for ( var i = 0; i < 16; i++) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
      }

      var hash = this.binb_sha256(ipad.concat(PasswordMaker_HashUtils
          .rstr2binb(data)), 512 + data.length * 8);
      return PasswordMaker_HashUtils.binb2rstr(this.binb_sha256(opad
          .concat(hash), 512 + ((bug) ? 160 : 256)));
    },

    /*
     * Main sha256 function, with its support functions
     */
    S : function(X, n) {
      return (X >>> n) | (X << (32 - n));
    },
    R : function(X, n) {
      return (X >>> n);
    },
    Ch : function(x, y, z) {
      return ((x & y) ^ ((~x) & z));
    },
    Maj : function(x, y, z) {
      return ((x & y) ^ (x & z) ^ (y & z));
    },
    Sigma0256 : function(x) {
      return (this.S(x, 2) ^ this.S(x, 13) ^ this.S(x, 22));
    },
    Sigma1256 : function(x) {
      return (this.S(x, 6) ^ this.S(x, 11) ^ this.S(x, 25));
    },
    Gamma0256 : function(x) {
      return (this.S(x, 7) ^ this.S(x, 18) ^ this.R(x, 3));
    },
    Gamma1256 : function(x) {
      return (this.S(x, 17) ^ this.S(x, 19) ^ this.R(x, 10));
    },
    Sigma0512 : function(x) {
      return (this.S(x, 28) ^ this.S(x, 34) ^ this.S(x, 39));
    },
    Sigma1512 : function(x) {
      return (this.S(x, 14) ^ this.S(x, 18) ^ this.S(x, 41));
    },
    Gamma0512 : function(x) {
      return (this.S(x, 1) ^ this.S(x, 8) ^ this.R(x, 7));
    },
    Gamma1512 : function(x) {
      return (this.S(x, 19) ^ this.S(x, 61) ^ this.R(x, 6));
    },

    sha256_K : new Array(1116352408, 1899447441, -1245643825, -373957723,
        961987163, 1508970993, -1841331548, -1424204075, -670586216,
        310598401, 607225278, 1426881987, 1925078388, -2132889090,
        -1680079193, -1046744716, -459576895, -272742522, 264347078,
        604807628, 770255983, 1249150122, 1555081692, 1996064986,
        -1740746414, -1473132947, -1341970488, -1084653625, -958395405,
        -710438585, 113926993, 338241895, 666307205, 773529912,
        1294757372, 1396182291, 1695183700, 1986661051, -2117940946,
        -1838011259, -1564481375, -1474664885, -1035236496, -949202525,
        -778901479, -694614492, -200395387, 275423344, 430227734,
        506948616, 659060556, 883997877, 958139571, 1322822218,
        1537002063, 1747873779, 1955562222, 2024104815, -2067236844,
        -1933114872, -1866530822, -1538233109, -1090935817, -965641998),

    binb_sha256 : function(m, l) {
      var HASH = new Array(1779033703, -1150833019, 1013904242,
          -1521486534, 1359893119, -1694144372, 528734635, 1541459225);
      var W = new Array(64);
      var a, b, c, d, e, f, g, h;
      var i, j, T1, T2;

      /* append padding */
      m[l >> 5] |= 0x80 << (24 - l % 32);
      m[((l + 64 >> 9) << 4) + 15] = l;

      for (i = 0; i < m.length; i += 16) {
        a = HASH[0];
        b = HASH[1];
        c = HASH[2];
        d = HASH[3];
        e = HASH[4];
        f = HASH[5];
        g = HASH[6];
        h = HASH[7];

        for (j = 0; j < 64; j++) {
          if (j < 16)
            W[j] = m[j + i];
          else
            W[j] = PasswordMaker_HashUtils.safe_add(
                PasswordMaker_HashUtils
                    .safe_add(PasswordMaker_HashUtils
                        .safe_add(this
                            .Gamma1256(W[j - 2]),
                            W[j - 7]), this
                        .Gamma0256(W[j - 15])),
                W[j - 16]);

          T1 = PasswordMaker_HashUtils.safe_add(
              PasswordMaker_HashUtils.safe_add(
                  PasswordMaker_HashUtils.safe_add(
                      PasswordMaker_HashUtils.safe_add(h,
                          this.Sigma1256(e)), this
                          .Ch(e, f, g)),
                  this.sha256_K[j]), W[j]);
          T2 = PasswordMaker_HashUtils.safe_add(this.Sigma0256(a),
              this.Maj(a, b, c));
          h = g;
          g = f;
          f = e;
          e = PasswordMaker_HashUtils.safe_add(d, T1);
          d = c;
          c = b;
          b = a;
          a = PasswordMaker_HashUtils.safe_add(T1, T2);
        }

        HASH[0] = PasswordMaker_HashUtils.safe_add(a, HASH[0]);
        HASH[1] = PasswordMaker_HashUtils.safe_add(b, HASH[1]);
        HASH[2] = PasswordMaker_HashUtils.safe_add(c, HASH[2]);
        HASH[3] = PasswordMaker_HashUtils.safe_add(d, HASH[3]);
        HASH[4] = PasswordMaker_HashUtils.safe_add(e, HASH[4]);
        HASH[5] = PasswordMaker_HashUtils.safe_add(f, HASH[5]);
        HASH[6] = PasswordMaker_HashUtils.safe_add(g, HASH[6]);
        HASH[7] = PasswordMaker_HashUtils.safe_add(h, HASH[7]);
      }
      return HASH;
    }
  }
}

// scripts/sha1.js

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1 Version 2.1 Copyright Paul Johnston 2000 - 2002. Other
 * contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet Distributed under the
 * BSD License See http://pajhome.org.uk/crypt/md5 for details.
 * 
 * Modified by Eric H. Jung (grimholtz@yahoo.com)
 */
if (typeof (PasswordMaker_SHA1) != "object") {
  var PasswordMaker_SHA1 = {

    any_sha1 : function(s, e) {
      return PasswordMaker_HashUtils.rstr2any(this
          .rstr_sha1(PasswordMaker_HashUtils.str2rstr_utf8(s)), e);
    },
    any_hmac_sha1 : function(k, d, e) {
      return PasswordMaker_HashUtils.rstr2any(this.rstr_hmac_sha1(
          PasswordMaker_HashUtils.str2rstr_utf8(k),
          PasswordMaker_HashUtils.str2rstr_utf8(d)), e);
    },

    /*
     * Calculate the SHA1 of a raw string
     */
    rstr_sha1 : function(s) {
      return PasswordMaker_HashUtils.binb2rstr(this.binb_sha1(
          PasswordMaker_HashUtils.rstr2binb(s), s.length
              * PasswordMaker_HashUtils.chrsz));
    },

    /*
     * Calculate the SHA-1 of an array of big-endian words and a bit length
     */
    binb_sha1 : function(x, len) {
      /* append padding */
      x[len >> 5] |= 0x80 << (24 - len % 32);
      x[((len + 64 >> 9) << 4) + 15] = len;

      var w = Array(80);
      var a = 1732584193;
      var b = -271733879;
      var c = -1732584194;
      var d = 271733878;
      var e = -1009589776;

      for ( var i = 0; i < x.length; i += 16) {
        var olda = a;
        var oldb = b;
        var oldc = c;
        var oldd = d;
        var olde = e;

        for ( var j = 0; j < 80; j++) {
          if (j < 16)
            w[j] = x[i + j];
          else
            w[j] = PasswordMaker_HashUtils.bit_rol(w[j - 3]
                ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
          var t = PasswordMaker_HashUtils.safe_add(
              PasswordMaker_HashUtils.safe_add(
                  PasswordMaker_HashUtils.bit_rol(a, 5), this
                      .sha1_ft(j, b, c, d)),
              PasswordMaker_HashUtils.safe_add(
                  PasswordMaker_HashUtils.safe_add(e, w[j]),
                  this.sha1_kt(j)));
          e = d;
          d = c;
          c = PasswordMaker_HashUtils.bit_rol(b, 30);
          b = a;
          a = t;
        }

        a = PasswordMaker_HashUtils.safe_add(a, olda);
        b = PasswordMaker_HashUtils.safe_add(b, oldb);
        c = PasswordMaker_HashUtils.safe_add(c, oldc);
        d = PasswordMaker_HashUtils.safe_add(d, oldd);
        e = PasswordMaker_HashUtils.safe_add(e, olde);
      }
      return Array(a, b, c, d, e);

    },

    /*
     * Perform the appropriate triplet combination function for the current
     * iteration
     */
    sha1_ft : function(t, b, c, d) {
      if (t < 20)
        return (b & c) | ((~b) & d);
      if (t < 40)
        return b ^ c ^ d;
      if (t < 60)
        return (b & c) | (b & d) | (c & d);
      return b ^ c ^ d;
    },

    /*
     * Determine the appropriate additive constant for the current iteration
     */
    sha1_kt : function(t) {
      return (t < 20) ? 1518500249 : (t < 40) ? 1859775393
          : (t < 60) ? -1894007588 : -899497514;
    },

    /*
     * Calculate the HMAC-SHA1 of a key and some data (raw strings)
     */
    rstr_hmac_sha1 : function(key, data) {
      var bkey = PasswordMaker_HashUtils.rstr2binb(key);
      if (bkey.length > 16)
        bkey = this.binb_sha1(bkey, key.length * 8);

      var ipad = Array(16), opad = Array(16);
      for ( var i = 0; i < 16; i++) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
      }

      var hash = this.binb_sha1(ipad.concat(PasswordMaker_HashUtils
          .rstr2binb(data)), 512 + data.length * 8);
      return PasswordMaker_HashUtils.binb2rstr(this.binb_sha1(opad
          .concat(hash), 512 + 160));
    }
  }
}

// scripts/ripemd160.js

/*
 * A JavaScript implementation of the RIPEMD-160 Algorithm Version 2.2-alpha
 * Copyright Jeremy Lin, Paul Johnston 2000 - 2005. Other contributors: Greg
 * Holt, Andrew Kepert, Ydnar, Lostinet Distributed under the BSD License See
 * http://pajhome.org.uk/crypt/md5 for details. Also
 * http://www.esat.kuleuven.ac.be/~cosicart/pdf/AB-9601/
 * 
 * Modified by Eric H. Jung (grimholtz@yahoo.com)
 */
if (typeof (PasswordMaker_RIPEMD160) != "object") {
  var PasswordMaker_RIPEMD160 = {

    any_rmd160 : function(s, e) {
      return PasswordMaker_HashUtils.rstr2any(this
          .rstr_rmd160(PasswordMaker_HashUtils.str2rstr_utf8(s)), e);
    },
    any_hmac_rmd160 : function(k, d, e) {
      return PasswordMaker_HashUtils.rstr2any(this.rstr_hmac_rmd160(
          PasswordMaker_HashUtils.str2rstr_utf8(k),
          PasswordMaker_HashUtils.str2rstr_utf8(d)), e);
    },

    /*
     * Calculate the rmd160 of a raw string
     */
    rstr_rmd160 : function(s) {
      return PasswordMaker_HashUtils.binl2rstr(this.binl_rmd160(
          PasswordMaker_HashUtils.rstr2binl(s), s.length
              * PasswordMaker_HashUtils.chrsz));
    },

    /*
     * Calculate the HMAC-rmd160 of a key and some data (raw strings)
     */
    rstr_hmac_rmd160 : function(key, data) {
      var bkey = PasswordMaker_HashUtils.rstr2binl(key);
      if (bkey.length > 16)
        bkey = this.binl_rmd160(bkey, key.length * 8);

      var ipad = Array(16), opad = Array(16);
      for ( var i = 0; i < 16; i++) {
        ipad[i] = bkey[i] ^ 0x36363636;
        opad[i] = bkey[i] ^ 0x5C5C5C5C;
      }

      var hash = this.binl_rmd160(ipad.concat(PasswordMaker_HashUtils
          .rstr2binl(data)), 512 + data.length * 8);
      return PasswordMaker_HashUtils.binl2rstr(this.binl_rmd160(opad
          .concat(hash), 512 + 160));
    },

    /*
     * Calculate the RIPE-MD160 of an array of little-endian words, and a
     * bit length.
     */
    binl_rmd160 : function(x, len) {
      /* append padding */
      x[len >> 5] |= 0x80 << (len % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;

      var h0 = 0x67452301;
      var h1 = 0xefcdab89;
      var h2 = 0x98badcfe;
      var h3 = 0x10325476;
      var h4 = 0xc3d2e1f0;

      for ( var i = 0; i < x.length; i += 16) {
        var T;
        var A1 = h0, B1 = h1, C1 = h2, D1 = h3, E1 = h4;
        var A2 = h0, B2 = h1, C2 = h2, D2 = h3, E2 = h4;
        for ( var j = 0; j <= 79; ++j) {
          T = PasswordMaker_HashUtils.safe_add(A1, this.rmd160_f(j,
              B1, C1, D1));
          T = PasswordMaker_HashUtils.safe_add(T, x[i
              + this.rmd160_r1[j]]);
          T = PasswordMaker_HashUtils.safe_add(T, this.rmd160_K1(j));
          T = PasswordMaker_HashUtils.safe_add(
              PasswordMaker_HashUtils.bit_rol(T,
                  this.rmd160_s1[j]), E1);
          A1 = E1;
          E1 = D1;
          D1 = PasswordMaker_HashUtils.bit_rol(C1, 10);
          C1 = B1;
          B1 = T;
          T = PasswordMaker_HashUtils.safe_add(A2, this.rmd160_f(
              79 - j, B2, C2, D2));
          T = PasswordMaker_HashUtils.safe_add(T, x[i
              + this.rmd160_r2[j]]);
          T = PasswordMaker_HashUtils.safe_add(T, this.rmd160_K2(j));
          T = PasswordMaker_HashUtils.safe_add(
              PasswordMaker_HashUtils.bit_rol(T,
                  this.rmd160_s2[j]), E2);
          A2 = E2;
          E2 = D2;
          D2 = PasswordMaker_HashUtils.bit_rol(C2, 10);
          C2 = B2;
          B2 = T;
        }
        T = PasswordMaker_HashUtils.safe_add(h1,
            PasswordMaker_HashUtils.safe_add(C1, D2));
        h1 = PasswordMaker_HashUtils.safe_add(h2,
            PasswordMaker_HashUtils.safe_add(D1, E2));
        h2 = PasswordMaker_HashUtils.safe_add(h3,
            PasswordMaker_HashUtils.safe_add(E1, A2));
        h3 = PasswordMaker_HashUtils.safe_add(h4,
            PasswordMaker_HashUtils.safe_add(A1, B2));
        h4 = PasswordMaker_HashUtils.safe_add(h0,
            PasswordMaker_HashUtils.safe_add(B1, C2));
        h0 = T;
      }
      return [ h0, h1, h2, h3, h4 ];
    },

    /*
     * Encode a string as utf-16
     */
    str2rstr_utf16le : function(input) {
      var output = "";
      for ( var i = 0; i < input.length; i++)
        output += String.fromCharCode(input.charCodeAt(i) & 0xFF,
            (input.charCodeAt(i) >>> 8) & 0xFF);
      return output;
    },

    str2rstr_utf16be : function(input) {
      var output = "";
      for ( var i = 0; i < input.length; i++)
        output += String.fromCharCode(
            (input.charCodeAt(i) >>> 8) & 0xFF,
            input.charCodeAt(i) & 0xFF);
      return output;
    },

    rmd160_f : function(j, x, y, z) {
      return (0 <= j && j <= 15) ? (x ^ y ^ z)
          : (16 <= j && j <= 31) ? (x & y) | (~x & z)
              : (32 <= j && j <= 47) ? (x | ~y) ^ z
                  : (48 <= j && j <= 63) ? (x & z) | (y & ~z)
                      : (64 <= j && j <= 79) ? x
                          ^ (y | ~z)
                          : "rmd160_f: j out of range";
    },

    rmd160_K1 : function(j) {
      return (0 <= j && j <= 15) ? 0x00000000
          : (16 <= j && j <= 31) ? 0x5a827999
              : (32 <= j && j <= 47) ? 0x6ed9eba1
                  : (48 <= j && j <= 63) ? 0x8f1bbcdc
                      : (64 <= j && j <= 79) ? 0xa953fd4e
                          : "rmd160_K1: j out of range";
    },

    rmd160_K2 : function(j) {
      return (0 <= j && j <= 15) ? 0x50a28be6
          : (16 <= j && j <= 31) ? 0x5c4dd124
              : (32 <= j && j <= 47) ? 0x6d703ef3
                  : (48 <= j && j <= 63) ? 0x7a6d76e9
                      : (64 <= j && j <= 79) ? 0x00000000
                          : "rmd160_K2: j out of range";
    },

    rmd160_r1 : [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7,
        4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14,
        4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8,
        12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14,
        1, 3, 8, 11, 6, 15, 13 ],

    rmd160_r2 : [ 5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6,
        11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3,
        7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15,
        0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2,
        13, 14, 0, 3, 9, 11 ],

    rmd160_s1 : [ 11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
        7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13,
        6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15,
        14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13,
        12, 5, 12, 13, 14, 11, 8, 5, 6 ],

    rmd160_s2 : [ 8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
        9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7,
        15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11,
        14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5,
        14, 6, 8, 13, 6, 5, 15, 13, 11, 11 ]
  }
}

// scripts/l33t.js

/**
 * PasswordMaker - Creates and manages passwords Copyright (C) 2005 Eric H. Jung
 * and LeahScape, Inc. http://passwordmaker.org/ grimholtz@yahoo.com This
 * library is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2.1 of the License, or (at your option)
 * any later version. This library is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESSFOR A PARTICULAR PURPOSE. See the GNU Lesser
 * General Public License for more details. You should have received a copy of
 * the GNU Lesser General Public License along with this library; if not, write
 * to the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA
 * 02111-1307 USA
 */
/*******************************************************************************
 * ECMAScript leetspeak - Version 1.0 by * Eric H. Jung <grimholtz@yahoo.com> * *
 * Ported from Oliver Gobin's <og@ogobin.org> * PHP leetspeak - Version 1.0 *
 * http://www.ogobin.org/bin/scripts/31337.php.inc * * What is leetspeak? *
 * http://www.wikipedia.org/wiki/Leet * http://www.heise.de/ct/00/11/003/ *
 ******************************************************************************/
if (typeof (PasswordMaker_l33t) != "boolean") {
  var PasswordMaker_l33t = true;
  var PasswordMaker_l33t = {
    alphabet : new Array(/a/g, /b/g, /c/g, /d/g, /e/g, /f/g, /g/g, /h/g,
        /i/g, /j/g, /k/g, /l/g, /m/g, /n/g, /o/g, /p/g, /q/g, /r/g,
        /s/g, /t/g, /u/g, /v/g, /w/g, /x/g, /y/g, /z/g),
    levels : new Array(new Array("4", "b", "c", "d", "3", "f", "g", "h",
        "i", "j", "k", "1", "m", "n", "0", "p", "9", "r", "s", "7",
        "u", "v", "w", "x", "y", "z"), new Array("4", "b", "c", "d",
        "3", "f", "g", "h", "1", "j", "k", "1", "m", "n", "0", "p",
        "9", "r", "5", "7", "u", "v", "w", "x", "y", "2"), new Array(
        "4", "8", "c", "d", "3", "f", "6", "h", "'", "j", "k", "1",
        "m", "n", "0", "p", "9", "r", "5", "7", "u", "v", "w", "x",
        "'/", "2"), new Array("@", "8", "c", "d", "3", "f", "6", "h",
        "'", "j", "k", "1", "m", "n", "0", "p", "9", "r", "5", "7",
        "u", "v", "w", "x", "'/", "2"), new Array("@", "|3", "c", "d",
        "3", "f", "6", "#", "!", "7", "|<", "1", "m", "n", "0", "|>",
        "9", "|2", "$", "7", "u", "\\/", "w", "x", "'/", "2"),
        new Array("@", "|3", "c", "|)", "&", "|=", "6", "#", "!", ",|",
            "|<", "1", "m", "n", "0", "|>", "9", "|2", "$", "7",
            "u", "\\/", "w", "x", "'/", "2"), new Array("@", "|3",
            "[", "|)", "&", "|=", "6", "#", "!", ",|", "|<", "1",
            "^^", "^/", "0", "|*", "9", "|2", "5", "7", "(_)",
            "\\/", "\\/\\/", "><", "'/", "2"), new Array("@", "8",
            "(", "|)", "&", "|=", "6", "|-|", "!", "_|", "|\(",
            "1", "|\\/|", "|\\|", "()", "|>", "(,)", "|2", "$",
            "|", "|_|", "\\/", "\\^/", ")(", "'/", "\"/_"),
        new Array("@", "8", "(", "|)", "&", "|=", "6", "|-|", "!",
            "_|", "|\{", "|_", "/\\/\\", "|\\|", "()", "|>", "(,)",
            "|2", "$", "|", "|_|", "\\/", "\\^/", ")(", "'/",
            "\"/_")),

    /**
     * Convert the string in _message_ to l33t-speak using the l33t level
     * specified by _leetLevel_. l33t levels are 1-9 with 1 being the
     * simplest form of l33t-speak and 9 being the most complex.
     * 
     * Note that _message_ is converted to lower-case if the l33t conversion
     * is performed. Future versions can support mixed-case, if we need it.
     * 
     * Using a _leetLevel_ <= 0 results in the original message being
     * returned.
     * 
     */
    convert : function(leetLevel, message) {
      if (leetLevel > -1) {
        var ret = message.toLowerCase();
        for ( var item = 0; item < this.alphabet.length; item++)
          ret = ret.replace(this.alphabet[item],
              this.levels[leetLevel][item]);
        return ret;
      }
      return message;
    }
  }
}

// scripts/cookie.js

// Borrowed from http://www.webreference.com/js/column8/functions.html
// Thanks, guys. -EHJ

/*
 * name - name of the cookie value - value of the cookie [expires] - expiration
 * date of the cookie (defaults to end of current session) [path] - path for
 * which the cookie is valid (defaults to path of calling document) [domain] -
 * domain for which the cookie is valid (defaults to domain of calling document)
 * [secure] - Boolean value indicating if the cookie transmission requires a
 * secure transmission an argument defaults when it is assigned null as a
 * placeholder a null placeholder is not required for trailing omitted arguments
 */
function setCookie(name, value, expires, path, domain, secure) {
  var curCookie = name + "=" + escape(value)
      + ((expires) ? "; expires=" + expires.toGMTString() : "")
      + ((path) ? "; path=" + path : "")
      + ((domain) ? "; domain=" + domain : "")
      + ((secure) ? "; secure" : "");
  document.cookie = curCookie;
}

/*
 * name - name of the desired cookie return string containing value of specified
 * cookie or null if cookie does not exist
 */
function getCookie(name) {
  var dc = document.cookie;
  var prefix = name + "=";
  var begin = dc.indexOf("; " + prefix);
  if (begin == -1) {
    begin = dc.indexOf(prefix);
    if (begin != 0)
      return null;
  } else
    begin += 2;
  var end = document.cookie.indexOf(";", begin);
  if (end == -1)
    end = dc.length;
  return unescape(dc.substring(begin + prefix.length, end));
}

/*
 * name - name of the cookie [path] - path of the cookie (must be same as path
 * used to create cookie) [domain] - domain of the cookie (must be same as
 * domain used to create cookie) path and domain default if assigned null or
 * omitted if no explicit argument proceeds
 */
function deleteCookie(name, path, domain) {
  document.cookie = name + "=" + ((path) ? "; path=" + path : "")
      + ((domain) ? "; domain=" + domain : "")
      + "; expires=Thu, 01-Jan-70 00:00:01 GMT";
}

// date - any instance of the Date object
// * hand all instances of the Date object to this function for "repairs"

function fixDate(date) {
  var base = new Date(0);
  var skew = base.getTime();
  if (skew > 0)
    date.setTime(date.getTime() - skew);
}

// scripts/hashutils.js

/**
 * PasswordMaker - Creates and manages passwords Copyright (C) 2005 Eric H. Jung
 * and LeahScape, Inc. http://passwordmaker.org/ grimholtz@yahoo.com This
 * library is free software; you can redistribute it and/or modify it under the
 * terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either version 2.1 of the License, or (at your option)
 * any later version. This library is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESSFOR A PARTICULAR PURPOSE. See the GNU Lesser
 * General Public License for more details. You should have received a copy of
 * the GNU Lesser General Public License along with this library; if not, write
 * to the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA
 * 02111-1307 USA
 */
/*
 * Common functions used by md4, md5, ripemd5, sha1, and sha256. Version 2.1
 * Copyright (C) Jerrad Pierce, Paul Johnston 1999 - 2002. Other contributors:
 * Greg Holt, Andrew Kepert, Ydnar, Lostinet Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 * 
 * Modified by Eric H. Jung (grimholtz@yahoo.com)
 */
if (typeof (PasswordMaker_HashUtils) != "object") {
  var PasswordMaker_HashUtils = {

    chrsz : 8, /* bits per input character. 8 - ASCII; 16 - Unicode */
    /*
     * Encode a string as utf-8. For efficiency, this assumes the input is
     * valid utf-16.
     */
    str2rstr_utf8 : function(input) {
      var output = "";
      var i = -1;
      var x, y;

      while (++i < input.length) {
        /* Decode utf-16 surrogate pairs */
        x = input.charCodeAt(i);
        y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
        if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
          x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
          i++;
        }

        /* Encode output as utf-8 */
        if (x <= 0x7F)
          output += String.fromCharCode(x);
        else if (x <= 0x7FF)
          output += String.fromCharCode(0xC0 | ((x >>> 6) & 0x1F),
              0x80 | (x & 0x3F));
        else if (x <= 0xFFFF)
          output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
              0x80 | ((x >>> 6) & 0x3F), 0x80 | (x & 0x3F));
        else if (x <= 0x1FFFFF)
          output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
              0x80 | ((x >>> 12) & 0x3F),
              0x80 | ((x >>> 6) & 0x3F), 0x80 | (x & 0x3F));
      }
      return output;
    },

    /*
     * Convert a raw string to an array of little-endian words Characters
     * >255 have their high-byte silently ignored.
     */
    rstr2binl : function(input) {
      var output = Array(input.length >> 2);
      for ( var i = 0; i < output.length; i++)
        output[i] = 0;
      for ( var i = 0; i < input.length * 8; i += 8)
        output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
      return output;
    },

    /*
     * Convert an array of little-endian words to a string
     */
    binl2rstr : function(input) {
      var output = "";
      for ( var i = 0; i < input.length * 32; i += 8)
        output += String
            .fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
      return output;
    },

    /*
     * Convert a raw string to an arbitrary string encoding
     */
    rstr2any : function(input, encoding) {
      var divisor = encoding.length;
      var remainders = Array();
      var i, q, x, quotient;

      /*
       * Convert to an array of 16-bit big-endian values, forming the
       * dividend
       */
      var dividend = Array(input.length / 2);
      var inp = new String(input); // EHJ: added
      for (i = 0; i < dividend.length; i++) {
        dividend[i] = (inp.charCodeAt(i * 2) << 8)
            | inp.charCodeAt(i * 2 + 1);
      }

      /*
       * Repeatedly perform a long division. The binary array forms the
       * dividend, the length of the encoding is the divisor. Once
       * computed, the quotient forms the dividend for the next step. We
       * stop when the dividend is zero. All remainders are stored for
       * later use.
       */
      while (dividend.length > 0) {
        quotient = Array();
        x = 0;
        for (i = 0; i < dividend.length; i++) {
          x = (x << 16) + dividend[i];
          q = Math.floor(x / divisor);
          x -= q * divisor;
          if (quotient.length > 0 || q > 0)
            quotient[quotient.length] = q;
        }
        remainders[remainders.length] = x;
        dividend = quotient;
      }

      /* Convert the remainders to the output string */
      var output = "";
      for (i = remainders.length - 1; i >= 0; i--)
        output += encoding.charAt(remainders[i]);

      return output;
    },

    // /===== big endian =====\\\

    /*
     * Convert a raw string to an array of big-endian words Characters >255
     * have their high-byte silently ignored.
     */
    rstr2binb : function(input) {
      var output = Array(input.length >> 2);
      for ( var i = 0; i < output.length; i++)
        output[i] = 0;
      for ( var i = 0; i < input.length * 8; i += 8)
        output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
      return output;
    },

    /*
     * Convert an array of big-endian words to a string
     */
    binb2rstr : function(input) {
      var output = "";
      for ( var i = 0; i < input.length * 32; i += 8)
        output += String
            .fromCharCode((input[i >> 5] >>> (24 - i % 32)) & 0xFF);
      return output;
    },

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    bit_rol : function(num, cnt) {
      return (num << cnt) | (num >>> (32 - cnt));
    },

    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations
     * internally to work around bugs in some JS interpreters.
     */
    safe_add : function(x, y) {
      var lsw = (x & 0xFFFF) + (y & 0xFFFF);
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xFFFF);
    }
  }
}
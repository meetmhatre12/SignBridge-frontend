// Source mapping imported from the user-provided ISL_Dictionary_words.csv.
export const DICTIONARY_VIDEO_LIBRARY = [
  {
    "folder": "All Dictionary Videos",
    "url": "https://drive.google.com/drive/folders/1U-Pr4r1-cupgNOOq9NH_uTsQnPSVEKco"
  },
  {
    "folder": "A",
    "url": "https://drive.google.com/drive/folders/1nkI7lddegUWDvmGsmn68QkB5ikp5_3kt?usp=drive_link"
  },
  {
    "folder": "B",
    "url": "https://drive.google.com/drive/folders/1S-G5qoWth0aI9fLzKs8Myv2LyMrq8jUh?usp=drive_link"
  },
  {
    "folder": "C",
    "url": "https://drive.google.com/drive/folders/1iZvUpDh5gtzoRmQKWAVfCOe8iWEjzS2S?usp=drive_link"
  },
  {
    "folder": "D",
    "url": "https://drive.google.com/drive/folders/1aQywSGpfHXOdM1pfs2rfqU3Y_ScLXRjh?usp=drive_link"
  },
  {
    "folder": "E",
    "url": "https://drive.google.com/drive/folders/13pJC91P8ligEXJh7ZcVbdOdBv8OM7ugw?usp=drive_link"
  },
  {
    "folder": "F",
    "url": "https://drive.google.com/drive/folders/1uwjIG-hYqxYTURtWMEpmCc9NzV13uz-S?usp=drive_link"
  },
  {
    "folder": "G",
    "url": "https://drive.google.com/drive/folders/1_jxELuDPMQb67NM6woqcdcn5QWd2mVeC?usp=drive_link"
  },
  {
    "folder": "H",
    "url": "https://drive.google.com/drive/folders/1BL9C7zyFAcRQg-DsM-CiIjsoFMbSvTCt?usp=drive_link"
  },
  {
    "folder": "I",
    "url": "https://drive.google.com/drive/folders/1K6eUYZLdCRh21Ecxx9wcsAJ3HP7jd4CI?usp=drive_link"
  },
  {
    "folder": "J",
    "url": "https://drive.google.com/drive/folders/198cCQXlwdAwmxabGVvXMZKQ-lnDclO37?usp=drive_link"
  },
  {
    "folder": "K",
    "url": "https://drive.google.com/drive/folders/1rXKlSTKyWJNqDL6-lupJuufMUZW7Zunc?usp=drive_link"
  },
  {
    "folder": "L",
    "url": "https://drive.google.com/drive/folders/1MbKLv9fBdLUPE4-PrSbSGBCnudtuKRTg?usp=drive_link"
  },
  {
    "folder": "M",
    "url": "https://drive.google.com/drive/folders/1qDHOYx4Eijrgo3cZHucMIlPRKgcK__8Z?usp=drive_link"
  },
  {
    "folder": "N",
    "url": "https://drive.google.com/drive/folders/1UUeBYdHraz86n9wgJG2HR4-gfMuO6o8e?usp=drive_link"
  },
  {
    "folder": "O",
    "url": "https://drive.google.com/drive/folders/1FZVV2snPZAR9_Zcy-XEo15cKgcVbMiUM?usp=drive_link"
  },
  {
    "folder": "P",
    "url": "https://drive.google.com/drive/folders/1hR6GnLjEj8_I5UPDJg3ZE0oQDzCnzXFy?usp=drive_link"
  },
  {
    "folder": "Q",
    "url": "https://drive.google.com/drive/folders/1Q6BYTJRyUElN6XCKrU9RXW2YzHGICPUA?usp=drive_link"
  },
  {
    "folder": "R",
    "url": "https://drive.google.com/drive/folders/1Zkr_CW-PmeGFjmJRmjA-lYubIVnFyb7o?usp=drive_link"
  },
  {
    "folder": "S",
    "url": "https://drive.google.com/drive/folders/1EQaicx76vWxgQwSosFQcAbrzgePEwPYN?usp=drive_link"
  },
  {
    "folder": "T",
    "url": "https://drive.google.com/drive/folders/1QcM74V2Q4OGRzDhZrP_ULHd5W4XgzmPw?usp=drive_link"
  },
  {
    "folder": "U",
    "url": "https://drive.google.com/drive/folders/1g9DxvHVMcoID1PhbvR8kJ5Mhq921hDcM?usp=drive_link"
  },
  {
    "folder": "V",
    "url": "https://drive.google.com/drive/folders/1hdhswMEW2FbBhi4GPgYsTBrhThpuSoNK?usp=drive_link"
  },
  {
    "folder": "W",
    "url": "https://drive.google.com/drive/folders/1JMWkAryDQ074isVeD0_umJfFHOhb3f6t?usp=drive_link"
  },
  {
    "folder": "X",
    "url": "https://drive.google.com/drive/folders/1t4mOWrTel2OXS76RX7b9X2Gf-6MqmrFp?usp=drive_link"
  },
  {
    "folder": "Y",
    "url": "https://drive.google.com/drive/folders/1wiWGUBD_R_KobXRAE3Erpp7XUZrUuYNb?usp=drive_link"
  },
  {
    "folder": "Z",
    "url": "https://drive.google.com/drive/folders/1cTyPjYRqrBTG2cEHQNXd4oRGkp9HtY4M?usp=drive_link"
  },
  {
    "folder": "Numbers",
    "url": "https://drive.google.com/drive/folders/1QBiSSz2zyV0CvaPRZo4V2jkn8FI2-jsT?usp=drive_link"
  }
] as const;
export const ALL_DICTIONARY_VIDEOS_URL = DICTIONARY_VIDEO_LIBRARY.find(x => x.folder === 'All Dictionary Videos')?.url || '';
export const DICTIONARY_VIDEO_BY_LETTER: Record<string,string> = Object.fromEntries(DICTIONARY_VIDEO_LIBRARY.filter(x => /^[A-Z]$/.test(x.folder)).map(x => [x.folder, x.url]));

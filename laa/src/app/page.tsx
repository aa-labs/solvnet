// src/app/page.tsx
"use client";
import Image from "next/image";
import styles from "./page.module.css";
import React, { useState } from 'react';
import 'dotenv/config';
import FormData from 'form-data';

function hexToUint8Array(hex: string) {
  hex = hex.trim();
  if (!hex) {
    throw new Error("Invalid hex string");
  }
  if (hex.startsWith("0x")) {
    hex = hex.substring(2);
  }
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }

  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new Error("Invalid hex string");
    }
    array[i / 2] = byte;
  }
  return array;
}

async function uploadUint8Array(data: Uint8Array) {
  const blob = new Blob([data], { type: "application/octet-stream" });
  console.log(blob);
  const file = new File([blob], "quote.bin", {
    type: "application/octet-stream",
  });
  console.log(file);
  const formData = new FormData();
  formData.append("file", file);

  const result = await fetch("https://dstack-sim-explorer.vercel.app/api/upload", {
    method: "POST",
    // @ts-ignore
    body: formData,
    mode: 'no-cors',
  });
  console.log(result);
  return result;
}

export default function Home() {
  const [result, setResult] = useState<string | null>(null);

  // Define the function to be called on button click
  const handleClick = async (path: string) => {
    try {
      let response, data;
      if (path === '/api/signMessage') {
        const messageData = { message: "t/acc" };
        response = await fetch(path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messageData),
        });
        data = await response.json();
        console.log(JSON.stringify(data));
        setResult(JSON.stringify(data, null, 2)); // Pretty print JSON
      } else {
        response = await fetch(path);
        data = await response.json();
        console.log(JSON.stringify(data));
        if (path === '/api/remoteAttestation') {
          const remoteAttestionQuoteHex = data.quote;
          console.log(remoteAttestionQuoteHex);
          const remoteAttestationQuoteU8Array = hexToUint8Array(remoteAttestionQuoteHex);
          console.log(remoteAttestationQuoteU8Array);
          console.log('Uploading Attestation...');
          const uploadResult = await uploadUint8Array(remoteAttestationQuoteU8Array);
          console.log(uploadResult);
          console.log('Upload Complete...');
        }
        setResult(JSON.stringify(data, null, 2)); // Pretty print JSON
      }
    } catch (error) {
      console.error('Error:', error);
      setResult('Error: ' + error);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="https://nextjs.org/icons/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol>
          <li>
            Generate a Remote Attestation.
          </li>
          <li>Get TEE Account.</li>
          <li>Test Signing Capabilities.</li>
        </ol>
        <div className={styles.ctas}>
          <a className={styles.primary} target="_blank"
             rel="noopener noreferrer" onClick={() => handleClick('/api/remoteAttestation')}>
            Remote Attestation
          </a>
          <a className={styles.primary} target="_blank"
             rel="noopener noreferrer" onClick={() => handleClick('/api/account/address')}>
            TEE Account
          </a>
        </div>

        <div className={styles.ctas}>
          <a className={styles.secondary} target="_blank"
             rel="noopener noreferrer" onClick={() => handleClick('/api/signMessage')}>
            Sign Message
          </a>
          <a className={styles.secondary} target="_blank"
             rel="noopener noreferrer" onClick={() => handleClick('/api/signTypedData')}>
            Sign Typed Data
          </a>
          <a className={styles.secondary} target="_blank"
             rel="noopener noreferrer" onClick={() => handleClick('/api/signTransaction')}>
            Sign Transaction
          </a>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://bit.ly/dstack-cheat-sheet"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="https://nextjs.org/icons/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          href="https://docs.phala.network/references/hackathon-guides/ethglobal-sf-hackathon-guide"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="https://nextjs.org/icons/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Guide
        </a>
        <a
          href="https://github.com/Phala-Network/nextjs-viem-dstack-template"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="https://nextjs.org/icons/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to Code →
        </a>
      </footer>
      <div className={styles.resultBox}>
        <h3>Result:</h3>
        <pre>{result}</pre>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { apiClient } from '../../api/apiClient';

/**
 * PrintIframe - Zero-pollution print renderer.
 * Injects clean, standalone HTML into a dedicated hidden iframe and triggers native window.print()
 * only on the iframe's contentWindow, leaving the main app UI (sidebar, topbar, modals) completely untouched.
 */
const PrintIframe = ({ htmlContent, autoPrint = false, onReady }) => {
  const iframeRef = useRef(null);

  const triggerPrint = () => {
    const iframe = iframeRef.current;
    if (!iframe || !htmlContent) return;

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>EduVault Print Document</title>
            <style>
              @page { margin: 8mm 10mm; size: auto; }
              @page thermal { margin: 2mm; size: 80mm auto; }
              @page a5 { margin: 6mm; size: A5 portrait; }
              @page idcard { margin: 0; size: 85.6mm 54mm landscape; }
              
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              .print-zone-thermal {
                width: 72mm;
                max-width: 76mm;
                margin: 0 auto;
                font-family: "Courier New", Courier, monospace;
              }
              .print-zone-a4 {
                width: 100%;
                max-width: 190mm;
                margin: 0 auto;
              }
              .print-zone-a5 {
                width: 100%;
                max-width: 140mm;
                margin: 0 auto;
              }
              .print-zone-twin-copy {
                width: 100%;
                max-width: 190mm;
                margin: 0 auto;
              }
              .print-scissor-line {
                border-top: 1px dashed #888;
                text-align: center;
                margin: 6mm 0;
                color: #777;
                font-size: 8pt;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              tr {
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printErr) {
          console.error('[PrintIframe] Print dialog error:', printErr);
        }
      }, 250);
    } catch (err) {
      console.error('[PrintIframe] Failed to write to print iframe:', err);
    }
  };

  useEffect(() => {
    if (onReady) {
      onReady(triggerPrint);
    }
    if (autoPrint && htmlContent) {
      triggerPrint();
    }
  }, [htmlContent, autoPrint]);

  return (
    <iframe
      ref={iframeRef}
      title="eduvault-isolated-print-frame"
      style={{
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '1px',
        height: '1px',
        border: 'none',
        opacity: 0.01,
        pointerEvents: 'none'
      }}
    />
  );
};

export const printDirectHtml = (htmlContent) => {
  if (!htmlContent) return;
  let iframe = document.getElementById('eduvault-standalone-print-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'eduvault-standalone-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>EduVault Print Document</title>
          <style>
            @page { margin: 8mm 10mm; size: auto; }
            @page thermal { margin: 2mm; size: 80mm auto; }
            @page a5 { margin: 6mm; size: A5 portrait; }
            @page idcard { margin: 0; size: 85.6mm 54mm landscape; }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-zone-thermal { width: 72mm; max-width: 76mm; margin: 0 auto; font-family: "Courier New", Courier, monospace; }
            .print-zone-a4 { width: 100%; max-width: 190mm; margin: 0 auto; }
            .print-zone-a5 { width: 100%; max-width: 140mm; margin: 0 auto; }
            .print-zone-twin-copy { width: 100%; max-width: 190mm; margin: 0 auto; }
            .print-scissor-line { border-top: 1px dashed #888; text-align: center; margin: 6mm 0; color: #777; font-size: 8pt; }
            table { width: 100%; border-collapse: collapse; }
            tr { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('[printDirectHtml] Print error:', err);
      }
    }, 250);
  } catch (e) {
    console.error('[printDirectHtml] Failed to write print iframe:', e);
  }
};

export const printRenderedDocument = async (documentType, recordId, fallbackHtml = '', extraParams = {}) => {
  try {
    const res = await apiClient.get(`/print-templates/render/${documentType}/${recordId}`, { params: extraParams });
    if (res.data?.renderedHtml) {
      printDirectHtml(res.data.renderedHtml);
      return true;
    }
  } catch (err) {
    console.warn(`[printRenderedDocument] Render API error for ${documentType}/${recordId}, fallback will be used:`, err);
  }

  if (fallbackHtml) {
    printDirectHtml(fallbackHtml);
    return true;
  }
  return false;
};

export default PrintIframe;

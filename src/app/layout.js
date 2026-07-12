import './globals.css';

export const metadata = {
  title: '403(b) Trade Tracker',
  description: 'Eagle Mountain International Church — 403(b) Trade P&L Tracker',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

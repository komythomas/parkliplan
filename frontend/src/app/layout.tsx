import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Parkliplan — Parking Lot Line Marking & Layout Planner',
  description: 'Interactive geospatial planning and measurement engine for parking lot line marking and pavement layouts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

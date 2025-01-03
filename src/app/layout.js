import "./globals.css";
import { getServerSession } from "next-auth";
import SessionProvider from "@/components/SessionProvider";

export const metadata = {
  title: "RAG Platform",
  description: "RAG Platform",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession();
  
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

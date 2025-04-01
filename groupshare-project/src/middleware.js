import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

// Używamy najprostszej wersji middleware bez dodatkowej logiki
export default clerkMiddleware(() => {
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
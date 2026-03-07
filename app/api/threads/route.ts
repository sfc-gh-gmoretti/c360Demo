import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST() {
  try {
    const thread = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json(thread);
  } catch (error) {
    console.error("Error creating thread:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

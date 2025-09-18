import Link from "next/link";
import { Container } from "@/components/container";

export const metadata = {
  title: "Privacy Policy  CareCircle",
  description: "Privacy Policy page",
};

export default function Page() {
  return (
    <Container>
      <div className="py-12">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <div className="mt-4 text-gray-600 space-y-4">
          <p>Your data remains private. We only use it to provide the service.</p>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-blue-700 underline"> Back home</Link>
        </div>
      </div>
    </Container>
  );
}


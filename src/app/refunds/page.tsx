import Link from "next/link";
import { Container } from "@/components/container";

export const metadata = {
  title: "Refund Policy  CareCircle",
  description: "Refund Policy page",
};

export default function Page() {
  return (
    <Container>
      <div className="py-12">
        <h1 className="text-3xl font-bold">Refund Policy</h1>
        <div className="mt-4 text-gray-600 space-y-4">
          <p>Subscriptions can be cancelled; see our policy for details.</p>
        </div>
        <div className="mt-8">
          <Link href="/" className="text-blue-700 underline"> Back home</Link>
        </div>
      </div>
    </Container>
  );
}


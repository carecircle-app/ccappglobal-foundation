import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";

export default function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kids</CardTitle>
        <CardDescription>Manage profiles and quick actions</CardDescription>
      </CardHeader>
      <CardContent>
        {/* your content */}
      </CardContent>
      <CardFooter>
        {/* actions */}
      </CardFooter>
    </Card>
  );
}


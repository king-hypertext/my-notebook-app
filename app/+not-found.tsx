import { useRouter } from "expo-router";

export default function NotFoundScreen() {
  const router = useRouter();
  return router.push('/');
}


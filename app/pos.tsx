import { Redirect } from 'expo-router';

// Redirect /pos -> /(tabs)/pos to avoid 500 error when visiting /pos directly on web.
export default function PosRedirect() {
  return <Redirect href="/(tabs)/pos" />;
}

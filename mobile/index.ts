// Background tasks must be registered before the router loads any screen,
// because Android can start the JS runtime with no UI at all.
import './src/background';
import 'expo-router/entry';

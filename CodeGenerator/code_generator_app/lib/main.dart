import 'package:flutter/material.dart';
import 'src/home_screen.dart';

void main() {
  runApp(const CodeGenApp());
}

class CodeGenApp extends StatelessWidget {
  const CodeGenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Code Generator',
      theme: ThemeData(
        colorSchemeSeed: Colors.indigo,
        useMaterial3: true,
      ),
      home: const HomeScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

enum GenMode { model, text }

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Ajusta la URL si tu backend corre en otro host/puerto
  final _backendCtrl = TextEditingController(text: 'http://127.0.0.1:8000');
  final _projectCtrl = TextEditingController(text: 'demo_project');

  // Campos para modo model/text
  GenMode _mode = GenMode.model;
  final _promptCtrl = TextEditingController(
    text:
        "Crea un API REST con FastAPI con /health, /status y un /hello. Usa 'content = { ... }'.",
  );
  final _textCtrl = TextEditingController(
    text: 'content = {"tree":"src/\\n","src/main.py":"print(\\"hola\\")\\n"}',
  );

  // Opcionales del backend
  final _languageHintCtrl = TextEditingController(text: "Flask + MongoDB");
  final _outDirCtrl = TextEditingController(text: "generated_projects");
  bool _noOverwrite = false;
  bool _allowHidden = false;
  bool _dryRun = false;

  // Estado UI
  bool _loading = false;
  String _status = '';
  String? _zipUrl; // /download/{project_name}
  String? _pdfUrl; // /download-ai-pdf/{project_name}

  Future<void> _generate() async {
    final backend = _backendCtrl.text.trim().replaceAll(RegExp(r'/+$'), '');
    if (backend.isEmpty) {
      setState(() => _status = 'Backend URL vacío');
      return;
    }
    final projectName = _projectCtrl.text.trim().isEmpty
        ? 'demo_project'
        : _projectCtrl.text.trim();

    setState(() {
      _loading = true;
      _status = 'Generando…';
      _zipUrl = null;
      _pdfUrl = null;
    });

    final body = <String, dynamic>{
      "mode": _mode == GenMode.model ? "model" : "text",
      "project_name": projectName,
      if (_outDirCtrl.text.trim().isNotEmpty) "out_dir": _outDirCtrl.text.trim(),
      if (_mode == GenMode.model) "prompt": _promptCtrl.text,
      if (_mode == GenMode.model && _languageHintCtrl.text.trim().isNotEmpty)
        "language_hint": _languageHintCtrl.text.trim(),
      if (_mode == GenMode.text) "text": _textCtrl.text,
      "no_overwrite": _noOverwrite,
      "allow_hidden_paths": _allowHidden,
      "dry_run": _dryRun,
    };

    try {
      final uri = Uri.parse('$backend/generate');
      final r = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      if (r.statusCode >= 200 && r.statusCode < 300) {
        final data = jsonDecode(r.body) as Map<String, dynamic>;
        final dls = (data['downloads'] ?? {}) as Map<String, dynamic>;
        final zipSuffix = dls['zip']?.toString();
        final pdfSuffix = dls['pdf']?.toString();

        setState(() {
          _status = '✅ Generado en: ${data["out_dir"] ?? "(ruta no informada)"}';
          _zipUrl = (zipSuffix != null) ? '$backend$zipSuffix' : null;
          _pdfUrl = (pdfSuffix != null) ? '$backend$pdfSuffix' : null;
        });
      } else {
        setState(() => _status = '❌ ${r.statusCode}: ${r.body}');
      }
    } catch (e) {
      setState(() => _status = '❌ Error: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  // ==== Helper CORREGIDO para abrir URLs (ZIP/PDF) ====
  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    final canOpen = await canLaunchUrl(uri);
    if (!canOpen) {
      setState(() => _status = 'No se pudo abrir: $url');
      return;
    }
    final ok = await launchUrl(
      uri,
      mode: LaunchMode.platformDefault,
      webOnlyWindowName: '_blank',
    );
    if (!ok) {
      setState(() => _status = 'No se pudo lanzar la URL');
    }
  }

  InputDecoration _dec(String label, [String? hint]) => InputDecoration(
        labelText: label,
        hintText: hint,
        border: const OutlineInputBorder(),
        isDense: true,
      );

  Widget _chip(String text, bool selected, VoidCallback onTap) {
    return ChoiceChip(
      label: Text(text),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final maxW = MediaQuery.of(context).size.width > 1000 ? 900.0 : 700.0;

    return Scaffold(
      appBar: AppBar(title: const Text('Generador de Proyectos')),
      body: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxW),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: ListView(
              children: [
                // Backend
                TextField(
                  controller: _backendCtrl,
                  decoration: _dec('Backend URL', 'http://127.0.0.1:8000'),
                ),
                const SizedBox(height: 12),

                // Nombre de proyecto separado del prompt
                TextField(
                  controller: _projectCtrl,
                  decoration: _dec('Nombre del proyecto', 'my_project'),
                ),
                const SizedBox(height: 12),

                // Out dir y flags
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _outDirCtrl,
                        decoration: _dec('Out dir', 'generated_projects'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _languageHintCtrl,
                        decoration:
                            _dec('language_hint (opcional)', 'Flask + MongoDB'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 12,
                  runSpacing: 8,
                  children: [
                    FilterChip(
                      selected: _noOverwrite,
                      label: const Text('no_overwrite'),
                      onSelected: (v) => setState(() => _noOverwrite = v),
                    ),
                    FilterChip(
                      selected: _allowHidden,
                      label: const Text('allow_hidden_paths'),
                      onSelected: (v) => setState(() => _allowHidden = v),
                    ),
                    FilterChip(
                      selected: _dryRun,
                      label: const Text('dry_run'),
                      onSelected: (v) => setState(() => _dryRun = v),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Modo
                Row(
                  children: [
                    _chip('model (LLM)', _mode == GenMode.model,
                        () => setState(() => _mode = GenMode.model)),
                    const SizedBox(width: 12),
                    _chip('text (content={})', _mode == GenMode.text,
                        () => setState(() => _mode = GenMode.text)),
                  ],
                ),
                const SizedBox(height: 12),

                if (_mode == GenMode.model) ...[
                  TextField(
                    controller: _promptCtrl,
                    minLines: 4,
                    maxLines: 10,
                    decoration:
                        _dec('Prompt', "Describe lo que quieres generar..."),
                  ),
                ] else ...[
                  TextField(
                    controller: _textCtrl,
                    minLines: 6,
                    maxLines: 16,
                    decoration: _dec(
                      'Texto (pega EXACTAMENTE: content = { ... })',
                      'content = {"tree":"...","path/file":"codigo"}',
                    ),
                  ),
                ],
                const SizedBox(height: 16),

                FilledButton.icon(
                  onPressed: _loading ? null : _generate,
                  icon: _loading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.play_arrow),
                  label: const Text('Generar'),
                ),
                const SizedBox(height: 12),

                // Estado
                Text(
                  _status,
                  style: const TextStyle(fontFamily: 'monospace'),
                ),

                // Descargas
                if (_zipUrl != null || _pdfUrl != null) ...[
                  const Divider(height: 24),
                  const Text(
                    'Descargas',
                    style:
                        TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    children: [
                      if (_zipUrl != null)
                        OutlinedButton.icon(
                          onPressed: () => _openUrl(_zipUrl!),
                          icon: const Icon(Icons.archive_outlined),
                          label: const Text('ZIP'),
                        ),
                      if (_pdfUrl != null)
                        OutlinedButton.icon(
                          onPressed: () => _openUrl(_pdfUrl!),
                          icon: const Icon(Icons.picture_as_pdf),
                          label: const Text('PDF (respuesta AI)'),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

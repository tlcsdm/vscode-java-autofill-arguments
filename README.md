# Java Autofill Arguments

A Visual Studio Code extension that automatically fills Java method call arguments based on parameter names.

## Features

- Auto-fill method arguments with parameter names
- Integration with VS Code code completion
- Keyboard shortcut support (Ctrl+Alt+O / Cmd+Alt+O)
- Context menu integration
- Works with Red Hat Java Language Support for better parameter resolution

## Usage

### Fill Arguments with Shortcut Key

1. Open a Java source file
2. Place the cursor inside a method call (between the parentheses)
3. Press `Ctrl+Alt+O` (Windows/Linux) or `Cmd+Alt+O` (macOS)
4. The method arguments will be filled with parameter names

### Fill Arguments via Context Menu

1. Open a Java source file
2. Right-click inside a method call
3. Select **tlcsdm** → **Fill Method Arguments**

### Fill Arguments via Command Palette

1. Open a Java source file
2. Place the cursor inside a method call
3. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
4. Search for "Fill Method Arguments"
5. Press Enter

### Using Code Completion

1. Open a Java source file
2. Type a method call and the opening parenthesis
3. The completion list will show "Fill all arguments" option
4. Select it to insert all parameter names as arguments

## Example

Before:
```java
public void example() {
    someMethod(|); // cursor here
}
```

After pressing `Ctrl+Alt+O`:
```java
public void example() {
    someMethod(param1, param2, param3);
}
```

## Configuration

Configure the behavior through VS Code settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `tlcsdm.autofill.enableCompletion` | Enable argument suggestions in code completion | `true` |
| `tlcsdm.autofill.useParameterNames` | Use parameter names as argument suggestions when available | `true` |
| `tlcsdm.autofill.fallbackToTypeName` | Use type names as fallback when parameter names are not available | `true` |

## Requirements

- VS Code 1.108.0 or higher
- For best results, install the [Language Support for Java(TM) by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.java) extension

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Tlcsdm Java Autofill Arguments"
4. Click Install

### From VSIX File
1. Download the `.vsix` file from [Releases](https://github.com/tlcsdm/vscode-java-autofill-arguments/releases)
2. In VS Code, open Command Palette (`Ctrl+Shift+P`)
3. Search for "Extensions: Install from VSIX..."
4. Select the downloaded `.vsix` file

### From Jenkins
Download from [Jenkins](https://jenkins.tlcsdm.com/job/vscode-plugin/job/vscode-java-autofill-arguments/)

## Build

This project uses TypeScript and npm (Node.js 22).

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode (for development)
npm run watch

# Lint
npm run lint

# Package
npx @vscode/vsce package

# Test
npm run test
```

## Related Projects

* [eclipse-autofill-arguments](https://github.com/tlcsdm/eclipse-autofill-arguments) - The Eclipse version of this plugin
* [vscode-java-method-sorter](https://github.com/tlcsdm/vscode-java-method-sorter) - Sort methods in Java classes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

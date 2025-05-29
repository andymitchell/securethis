# @andyrmitchell/securethis 🛡️

A CLI tool that performs security scans on your codebase using popular SAST engines (e.g. [Fluid Attacks](https://fluidattacks.com/)).

## ⚠️ Prerequisites

Before you can use `securethis`, you **must** have **Docker** installed and running on your system.
*   [Install Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows, macOS, Linux)
*   Ensure the Docker daemon is active.

## 📦 Installation

Install `secureThis` as a development dependency in your project:

```bash
npm i -D @andyrmitchell/securethis
# or
yarn add --dev @andyrmitchell/securethis
```

## 🚀 Usage

Once installed, you can run security scans on your project by executing the following command from your project's root directory:

```bash
npx securethis
```

The first time it runs it'll create a config file next to package.json, called `securethis.config.ts`; and ask you to run it again. 

The `npx securethis` command will:
1.  Check for Docker.
2.  Pull the necessary Docker image(s) for the scanners (if not already present).
3.  Mount your current working directory (your codebase) into the Docker container.
4.  Execute the security scan(s).
5.  Display the results in your console.

### Recommendations

* Add it to your build process as an initial step


## ⚙️ Configuration

You can edit `securethis.config.ts` in your project root. (Can't see it? Run `npx securethis` and it'll be created then halt before executing any scans.)

E.g. you can edit the output directory, and what files are excluded.

## 🔬 Supported Scans

`securethis` currently supports the following types of scans:

### **FluidAttacks (SAST - Static Application Security Testing)**

* **Description:** Analyzes your source code without executing it to find potential security vulnerabilities, such as SQL injection, XSS, insecure configurations, and more.
* **Engine:** [FluidAttacks Scanner](https://fluidattacks.com/scanner/)
* **How it works:** It loads in Docker and creates a virtual (read only) mapping to your project (by dynamically creating a yaml config file from its internal `base-fluid-attacks-config.yaml` and `securethis.config.ts` in your project root).

## 📄 Output & Reports

Scan results, including identified vulnerabilities and their locations, will be printed directly to your console.




## 🛣️ Roadmap

*   [ ] Support for more SAST engines
*   [ ] Consider support DAST engines
*   [ ] Software Composition Analysis (SCA) for vulnerable dependencies.
*   [ ] Secret scanning
*   [ ] CI/CD integration guides and examples

## 🔧 Troubleshooting

*   **`Docker command not found` or `Cannot connect to the Docker daemon`:**
    *   Ensure Docker is installed correctly and the Docker daemon/service is running.
    *   You might need to start Docker Desktop or run `sudo systemctl start docker` (on Linux).
*   **Scan fails unexpectedly:**
    *   Check the console output for specific error messages from the underlying scanner.


## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

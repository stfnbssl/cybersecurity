# The Vision of Wizzi Factory

The Wizzi Factory is a **General-Purpose Platform** designed for the **Meta Model Driven Generation of Structured Text Data**, enabling a unified and powerful approach to transforming context-driven templated source documents into diverse, structured text artifacts.

## Key Pillars of the Vision

### 1. General-Purpose Platform  
Wizzi Factory is built on a universal foundation that standardizes formats, processes, and methodologies for modeling data, schemas, templates, and transformations.  
- All generation processes share a consistent syntax, regardless of the type of text output.  
- This ensures a cohesive, reusable framework adaptable to any structured text generation task.

### 2. Meta  
The platform supports cascading, multi-step generation processes:  
- Each generation step can define the **context data and template structure** for subsequent steps.  
- Templates, models, and data structures are **composable and processable iteratively**, creating dynamic and adaptive workflows.

### 3. Model-Driven  
Wizzi Factory emphasizes using **contextual data** to drive template transformations:  
- Data models define the relationships, hierarchies, and processing rules that guide template outputs.  
- This ensures outputs are consistently tailored to meet specific requirements.

### 4. Structured Text  
The platform focuses on generating text-based artifacts that can serve as standalone outputs or be further processed by external tools:  
- **Target Types**: Program code (e.g., Java, Python, HTML), configuration files, and narrative documents such as SVG, CSS, and HTML.  
- **Broader Applications**: Outputs extend to formats processed by third-party tools capable of generating documents from text (e.g., PDFs, PowerPoint slides, Word documents, Kindle books).

## The Essence of Wizzi Factory

At its core, Wizzi Factory provides a robust infrastructure for setting up **meta-generations of structured text documents**, encompassing the following principles:

- **Data Structures**  
  Defining relationships and hierarchies within the models that drive template transformations.

- **Templatable Source Documents**  
  Providing **composable and templatable skeletons** of the output text to be generated. These skeletons undergo transformations driven by context and templates to produce final outputs.

- **Universality**  
  Both **data structures** and **templatable source documents** are:  
  - **Coded with the same format** (see later: "ITTF Format").  
  - **Processed using the same foundational transformation process** (see later: "mTree Processing").

- **Pluggability**  
  The flexibility of generations is enabled by a plugin system. Each target text type is supported by its own plugin.  
  - **Schema**: Each plugin defines a schema applied to a text input that shares the same basic format across all text types.  
  - **Specialized Artifact Generators**: Plugins include specialized generators to produce the specific outputs for their respective text type.


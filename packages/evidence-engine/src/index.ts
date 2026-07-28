import {
  ProjectAssertion,
  AssertionStatus,
  EvidenceReference
} from "@ai-optimize/contracts";

export class EvidenceEngine {
  private assertions: Map<string, ProjectAssertion> = new Map();

  public createAssertion(params: {
    id?: string;
    subject: string;
    predicate: string;
    value: unknown;
    status: AssertionStatus;
    confidence: number;
    sources: EvidenceReference[];
    explanation: string;
  }): ProjectAssertion {
    const id = params.id || `ast_${params.subject}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assertion: ProjectAssertion = {
      id,
      subject: params.subject,
      predicate: params.predicate,
      value: params.value,
      status: params.status,
      confidence: Math.max(0, Math.min(1, params.confidence)),
      sources: params.sources,
      explanation: params.explanation,
      createdAt: new Date().toISOString()
    };

    this.assertions.set(id, assertion);
    return assertion;
  }

  public getAssertions(): ProjectAssertion[] {
    return Array.from(this.assertions.values());
  }

  public getAssertionsBySubject(subject: string): ProjectAssertion[] {
    return this.getAssertions().filter((a) => a.subject === subject);
  }

  public clear(): void {
    this.assertions.clear();
  }
}

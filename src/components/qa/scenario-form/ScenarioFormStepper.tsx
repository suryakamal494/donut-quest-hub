interface ScenarioFormStepperProps {
  steps: string[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export function ScenarioFormStepper({ steps, currentStep, setCurrentStep }: ScenarioFormStepperProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <button
            onClick={() => index <= currentStep && setCurrentStep(index)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
              index === currentStep
                ? "bg-primary text-primary-foreground"
                : index < currentStep
                ? "bg-primary/20 text-primary cursor-pointer"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
              {index + 1}
            </span>
            <span className="hidden sm:inline">{step}</span>
          </button>
          {index < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-1 ${
              index < currentStep ? "bg-primary" : "bg-muted"
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}

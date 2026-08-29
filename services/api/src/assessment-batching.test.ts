import { describe, expect, it } from "vitest";
import { buildAssessmentBatchInput, getAssessmentBatchPlan, orchestrateAssessmentBatches } from "./assessment-batching.js";
import type { OrchestratorResult, StudentQuestion } from "./orchestrator/types.js";

function assessmentInput(total:10|20|40):StudentQuestion{
  return{
    question:`Matematik dersi, 9. sınıf seviyesi için seviye belirleme testi hazırla. TAM OLARAK ${total} çoktan seçmeli soru üret. answer alanına yalnızca geçerli JSON dizi yaz ve toplam ${total} nesne bulunsun.`,
    inputType:"text",
    intent:"generate_test",
  };
}

function fakeResult(answer:string):OrchestratorResult{
  return{
    analysis:{topic:"Matematik",subtopic:"Genel Tarama",exam:"NONE",difficulty:"medium",needsVision:false,needsVerification:true,confidence:.9},
    answer:{answer,explanation:"",steps:[],hint:undefined,detectedSubject:"Matematik",detectedTopic:"Genel Tarama",verified:false,verificationStatus:"not_applicable",confidence:.9},
    consensusStatus:"single",
    providersUsed:["deepseek"],
    agreementScore:1,
    finalAnswerSource:"deepseek",
    message:"Soru seti hazırlandı.",
  };
}

describe("Seviye belirleme parçalı üretimi",()=>{
  it("20 ve 40 soruluk testleri 10'ar soruluk parçalara böler",()=>{
    expect(getAssessmentBatchPlan(assessmentInput(20))).toEqual({totalQuestions:20,batchSize:10,batchCount:2});
    expect(getAssessmentBatchPlan(assessmentInput(40))).toEqual({totalQuestions:40,batchSize:10,batchCount:4});
    expect(getAssessmentBatchPlan(assessmentInput(10))).toEqual({totalQuestions:10,batchSize:10,batchCount:1});
  });

  it("normal soru üretimini seviye testi parçalama akışına sokmaz",()=>{
    const input:StudentQuestion={question:"3 benzer soru üret",inputType:"text",intent:"generate_test"};
    expect(getAssessmentBatchPlan(input)).toBeNull();
  });

  it("her parçada yalnızca 10 soru ister ve parça numarasını ekler",()=>{
    const input=assessmentInput(40);
    const plan=getAssessmentBatchPlan(input)!;
    const batch=buildAssessmentBatchInput(input,plan,1);
    expect(batch.question).toContain("TAM OLARAK 10 çoktan seçmeli soru üret");
    expect(batch.question).toContain("toplam 10 nesne bulunsun");
    expect(batch.question).toContain("2/4. parçasıdır");
    expect(batch.question).toContain("tek çağrıda 40 soru üretme");
  });

  it("20 soruluk sonucu iki 10 soruluk AI cevabından birleştirir",async()=>{
    let call=0;
    const result=await orchestrateAssessmentBatches(assessmentInput(20),async input=>{
      call+=1;
      expect(input.question).toContain("TAM OLARAK 10 çoktan seçmeli soru üret");
      const items=Array.from({length:10},(_,index)=>({question:`Parça ${call} Soru ${index+1}`,options:["A","B","C","D","E"],correctIndex:0,hint:"İpucu",topic:"Konu"}));
      return fakeResult(JSON.stringify(items));
    });
    const merged=JSON.parse(result.answer!.answer) as unknown[];
    expect(call).toBe(2);
    expect(merged).toHaveLength(20);
    expect(result.finalAnswerSource).toBe("assessment-batches-2x10");
    expect(result.providersUsed).toEqual(["deepseek"]);
  });
});

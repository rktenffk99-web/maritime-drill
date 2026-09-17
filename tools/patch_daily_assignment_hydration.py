from pathlib import Path

p=Path('index.html')
text=p.read_text(encoding='utf-8-sig')
original=text
MARKER='daily-assignment-hydration-fallback-v1'

if MARKER not in text:
    old="""      const checkpoint=ppLoadPassSessionCheckpoint();
      const queue=await ppHydrateKeys(allKeys);if(!queue.length||queue.length!==allKeys.length)throw new Error('문제 원문을 찾지 못했습니다.');
      const checkpointMatches=checkpoint&&Array.isArray(checkpoint.queueKeys)&&checkpoint.queueKeys.length===allKeys.length&&checkpoint.queueKeys.every((k,i)=>k===allKeys[i]);
"""
    new="""      const checkpoint=ppLoadPassSessionCheckpoint();
      let queue=await ppHydrateKeys(allKeys); // daily-assignment-hydration-fallback-v1
      if(!queue.length)throw new Error('문제 원문을 찾지 못했습니다.');
      let activeKeys=allKeys.slice();
      if(queue.length!==allKeys.length){
        const hydrated=new Set(queue.map(q=>q&&q._planKey).filter(Boolean));
        const missing=allKeys.filter(k=>!hydrated.has(k));
        console.warn('[pass-plan] stale daily assignment keys skipped',missing);
        activeKeys=allKeys.filter(k=>hydrated.has(k));
        queue=activeKeys.map(k=>queue.find(q=>q&&q._planKey===k)).filter(Boolean);
        ppClearPassSessionCheckpoint();
      }
      if(!queue.length)throw new Error('현재 불러올 수 있는 문제 원문이 없습니다.');
      const checkpointMatches=checkpoint&&activeKeys.length===allKeys.length&&Array.isArray(checkpoint.queueKeys)&&checkpoint.queueKeys.length===activeKeys.length&&checkpoint.queueKeys.every((k,i)=>k===activeKeys[i]);
"""
    if old not in text:
        raise SystemExit('daily hydration anchor not found')
    text=text.replace(old,new,1)

    old="""      let startIndex=allKeys.findIndex(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
      if(startIndex<0)startIndex=0;
      planSessionQueue=queue;planSessionIdx=startIndex;planSessionAnswers=new Array(queue.length).fill(null);planSessionConfidence=new Array(queue.length).fill(null);planSessionStartedAt=Date.now();planSessionCommitted=new Set();
      for(let i=0;i<startIndex;i++)if(ppTodayCleared(ppProgressFor(progress,allKeys[i]),today))planSessionCommitted.add(i);
"""
    new="""      let startIndex=activeKeys.findIndex(k=>!ppTodayCleared(ppProgressFor(progress,k),today));
      if(startIndex<0)startIndex=0;
      planSessionQueue=queue;planSessionIdx=startIndex;planSessionAnswers=new Array(queue.length).fill(null);planSessionConfidence=new Array(queue.length).fill(null);planSessionStartedAt=Date.now();planSessionCommitted=new Set();
      for(let i=0;i<startIndex;i++)if(ppTodayCleared(ppProgressFor(progress,activeKeys[i]),today))planSessionCommitted.add(i);
"""
    if old not in text:
        raise SystemExit('daily hydration start-index anchor not found')
    text=text.replace(old,new,1)

if MARKER not in text:
    raise SystemExit('daily assignment hydration fallback marker missing')

if text!=original:
    p.write_text(text,encoding='utf-8')
    print('patched stale daily assignment hydration fallback')
else:
    print('daily assignment hydration fallback already patched')

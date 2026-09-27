package org.kruskopf.podplayer.backend.counter;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/counter")
public class CounterController {

    private static final long COUNTER_ID = 1L;

    private final CounterRepository counterRepository;

    public CounterController(CounterRepository counterRepository) {
        this.counterRepository = counterRepository;
    }

    @GetMapping
    public int getCount() {
        return counterRepository.findById(COUNTER_ID)
                .map(Counter::getCount)
                .orElse(0);
    }

    @PostMapping("/increment")
    public int increment() {
        Counter counter = counterRepository.findById(COUNTER_ID)
                .orElseGet(() -> {
                    Counter newCounter = new Counter();
                    newCounter.setId(COUNTER_ID);
                    newCounter.setCount(0);
                    return newCounter;
                });
        counter.setCount(counter.getCount() + 1);
        counterRepository.save(counter);
        return counter.getCount();
    }
}